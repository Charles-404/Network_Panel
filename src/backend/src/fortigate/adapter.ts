import https from 'https';
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface FortiGateConfig {
  host: string;
  token: string;
  port?: number;
}

interface FortiGateResponse {
  http_method: string;
  results: any;
  status: string;
  http_status?: number;
  count: number;
  serial: string;
  version: string;
}

class FortiGateAdapter {
  private config: FortiGateConfig;

  constructor(config?: Partial<FortiGateConfig>) {
    this.config = {
      host: config?.host || process.env.FORTIGATE_HOST || '',
      token: config?.token || process.env.FORTIGATE_TOKEN || '',
      port: config?.port || 443,
    };
  }

  isConfigured(): boolean {
    return !!(this.config.host && this.config.token);
  }

  private async request<T>(endpoint: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.config.host,
        port: this.config.port,
        path: endpoint,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + this.config.token },
        rejectUnauthorized: false,
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(data) as FortiGateResponse;
            if (response.status !== 'success') {
              reject(new Error('API error: ' + response.status + (response.http_status ? ' HTTP ' + response.http_status : '')));
            } else {
              resolve(response.results as T);
            }
          } catch (err) {
            reject(new Error('Parse error: ' + data.substring(0, 200)));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });
  }

  // --- System ---
  async getSystemStatus(): Promise<any> {
    return this.request('/api/v2/monitor/system/status');
  }

  async getSystemGlobal(): Promise<any> {
    return this.request('/api/v2/cmdb/system/global');
  }

  // --- CPU/Memory (NEW!) ---
  async getResourceUsage(): Promise<any> {
    return this.request('/api/v2/monitor/system/resource/usage');
  }

  // --- Interfaces with traffic (NEW!) ---
  async getMonitorInterfaces(): Promise<any> {
    return this.request('/api/v2/monitor/system/interface');
  }

  async getCmdbInterfaces(): Promise<any[]> {
    const result = await this.request<any>('/api/v2/cmdb/system/interface');
    return Array.isArray(result) ? result : [];
  }

  // --- Firewall ---
  async getFirewallPolicies(): Promise<any[]> {
    return this.request<any[]>('/api/v2/monitor/firewall/policy');
  }

  // --- VPN ---
  async getVpnIpsecTunnels(): Promise<any[]> {
    return this.request<any[]>('/api/v2/monitor/vpn/ipsec');
  }

  async getVpnPhase1Config(): Promise<any[]> {
    const result = await this.request<any>('/api/v2/cmdb/vpn.ipsec/phase1-interface');
    return Array.isArray(result) ? result : [];
  }

  // --- Routing ---
  async getRouterIpv4(): Promise<any[]> {
    return this.request<any[]>('/api/v2/monitor/router/ipv4');
  }

  // Aggregate all
  async getAllData() {
    const [status, global, resources, monitorIfaces, cmdbIfaces, policies, vpnTunnels, vpnConfig, routes] = await Promise.allSettled([
      this.getSystemStatus(),
      this.getSystemGlobal(),
      this.getResourceUsage(),
      this.getMonitorInterfaces(),
      this.getCmdbInterfaces(),
      this.getFirewallPolicies(),
      this.getVpnIpsecTunnels(),
      this.getVpnPhase1Config(),
      this.getRouterIpv4(),
    ]);

    return {
      status: status.status === 'fulfilled' ? status.value : null,
      global: global.status === 'fulfilled' ? global.value : null,
      resources: resources.status === 'fulfilled' ? resources.value : null,
      monitorInterfaces: monitorIfaces.status === 'fulfilled' ? monitorIfaces.value : null,
      cmdbInterfaces: cmdbIfaces.status === 'fulfilled' ? cmdbIfaces.value : [],
      policies: policies.status === 'fulfilled' ? policies.value : [],
      vpnTunnels: vpnTunnels.status === 'fulfilled' ? vpnTunnels.value : [],
      vpnConfig: vpnConfig.status === 'fulfilled' ? vpnConfig.value : [],
      routes: routes.status === 'fulfilled' ? routes.value : [],
    };
  }
}

let adapter: FortiGateAdapter | null = null;

export function getFortiGateAdapter(): FortiGateAdapter {
  if (!adapter) adapter = new FortiGateAdapter();
  return adapter;
}

export default FortiGateAdapter;
