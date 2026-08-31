import type { FastifyInstance } from 'fastify';
import { getLatestSystemStatus, getLatestTrafficStats, getRecentEvents, getHistoryMetrics, getTopology, getDashboardMetrics, getDevicesWithTraffic } from '../collectors/mockCollector.js';
import { getFortiGateAdapter } from '../fortigate/adapter.js';
import { alertManager } from '../alerts/manager.js';
import { alertRulesEngine } from '../alerts/rules.js';
import type { AlertStatus, Severity } from '../alerts/index.js';
import { registerAuthRoutes } from '../auth/routes.js';
import { registerSettingsRoutes } from '../settings/routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Register auth and settings routes
  await registerAuthRoutes(app);
  await registerSettingsRoutes(app);
  // ============================================================
  // Health
  // ============================================================
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date() };
  });

  // ============================================================
  // System status
  // ============================================================
  app.get('/api/status', async () => {
    const systemStatus = await getLatestSystemStatus();
    const trafficStats = await getLatestTrafficStats();
    return { success: true, data: { system: systemStatus, traffic: trafficStats }, timestamp: new Date() };
  });

  // ============================================================
  // FortiGate endpoints
  // ============================================================
  app.get('/api/fortigate/status', async () => {
    const adapter = getFortiGateAdapter();
    return { success: true, data: { configured: adapter.isConfigured(), host: process.env.FORTIGATE_HOST || null }, timestamp: new Date() };
  });

  app.get('/api/fortigate/system', async (_request, reply) => {
    const adapter = getFortiGateAdapter();
    if (!adapter.isConfigured()) {
      return reply.code(503).send({ success: false, error: 'FortiGate not configured', timestamp: new Date() });
    }
    try {
      const [status, global] = await Promise.all([adapter.getSystemStatus(), adapter.getSystemGlobal()]);
      const dbStatus = await getLatestSystemStatus() as any;
      return {
        success: true,
        data: {
          name: (global as any)?.hostname || 'FortiGate 30E',
          model: 'FortiGate-30E',
          serial: (status as any)?.serial || 'FGT30E5618046565',
          firmwareVersion: (status as any)?.version || 'v6.2.16',
          uptimeSeconds: dbStatus?.uptime_seconds || 0,
          status: 'online',
          system: {
            cpu: dbStatus?.cpu_usage || 0,
            memory: dbStatus?.memory_usage || 0,
            memoryTotal: dbStatus?.memory_total || 0,
            memoryUsed: dbStatus?.memory_used || 0,
            temperature: dbStatus?.temperature || 0,
            sessionCount: dbStatus?.session_count || 0,
            sessionRate: dbStatus?.session_rate || 0,
            packetRate: dbStatus?.packet_rate || 0,
            firmwareVersion: (status as any)?.version || 'v6.2.16',
            uptimeSeconds: dbStatus?.uptime_seconds || 0,
            lastUpdate: new Date(),
          },
        },
        timestamp: new Date(),
      };
    } catch (err: any) {
      return reply.code(502).send({ success: false, error: 'FortiGate API error: ' + err.message, timestamp: new Date() });
    }
  });

  app.get('/api/fortigate/interfaces', async (_request, reply) => {
    const adapter = getFortiGateAdapter();
    if (!adapter.isConfigured()) {
      return reply.code(503).send({ success: false, error: 'FortiGate not configured', timestamp: new Date() });
    }
    try {
      const ifaces = await adapter.getMonitorInterfaces();
      const mapped = ifaces.map((i: any) => ({
        name: i.name,
        status: i.status || (i.ip && i.ip !== '0.0.0.0' ? 'up' : 'down'),
        ip: i.ip,
        mask: i.mask,
        mac: i.mac || '',
        mode: i.mode,
        speed: parseInt(i.speed) || 0,
        rxBytes: 0,
        txBytes: 0,
        rxPackets: 0,
        txPackets: 0,
        rxErrors: 0,
        txErrors: 0,
        rxDrops: 0,
        txDrops: 0,
        lastUpdate: new Date(),
      }));
      return { success: true, data: mapped, timestamp: new Date() };
    } catch (err: any) {
      return reply.code(502).send({ success: false, error: err.message, timestamp: new Date() });
    }
  });

  app.get('/api/fortigate/vpn', async (_request, reply) => {
    const adapter = getFortiGateAdapter();
    if (!adapter.isConfigured()) {
      return reply.code(503).send({ success: false, error: 'FortiGate not configured', timestamp: new Date() });
    }
    try {
      const [tunnels, config] = await Promise.all([adapter.getVpnIpsecTunnels(), adapter.getVpnPhase1Config()]);
      const merged = config.map((c: any) => {
        const monitor = (tunnels as any[]).find((t: any) => t.name === c.name || t.proxyid?.[0]?.p1name === c.name);
        return {
          name: c.name,
          status: monitor ? 'active' : 'inactive',
          type: 'ipsec',
          remoteGateway: c.remote_gw || '',
          bytesIn: monitor?.proxyid?.[0]?.p2name ? 0 : 0,
          bytesOut: 0,
          uptime: 0,
        };
      });
      return { success: true, data: merged, timestamp: new Date() };
    } catch (err: any) {
      return reply.code(502).send({ success: false, error: err.message, timestamp: new Date() });
    }
  });

    // ============================================================
  // SNMP endpoints
  // ============================================================
  app.post('/api/snmp/test', async (request, reply) => {
    const body = request.body as {
      host: string;
      community?: string;
      port?: number;
      version?: string;
      username?: string;
      authPassword?: string;
      authProtocol?: string;
      privPassword?: string;
      privProtocol?: string;
    };

    if (!body.host) {
      return reply.code(400).send({ success: false, error: '主机地址不能为空', timestamp: new Date() });
    }

    try {
      const snmp = await import('net-snmp');
      
      const options: any = {
        port: body.port || 161,
        timeout: 5000,
        retries: 1,
      };

      // Handle SNMPv3 options
      if (body.version === '3' && body.username) {
        options.version = snmp.default.SnmpVersion.v3;
        options.security = {
          username: body.username,
          level: snmp.default.SecurityLevel.authPriv,
        };
        
        if (body.authPassword && body.authProtocol) {
          options.security.authProtocol = body.authProtocol;
          options.security.authPassword = body.authPassword;
        }
        
        if (body.privPassword && body.privProtocol) {
          options.security.privProtocol = body.privProtocol;
          options.security.privPassword = body.privPassword;
        }
      }

      const session = snmp.default.createSession(body.host, body.community || 'public', options);
      
      return new Promise((resolve) => {
        // Try to get sysDescr (1.3.6.1.2.1.1.1.0)
        session.get(['1.3.6.1.2.1.1.1.0'], (error: any, varbinds: any[]) => {
          session.close();
          
          if (error) {
            resolve({
              success: false,
              error: `SNMP连接失败: ${error.message || error}`,
              timestamp: new Date(),
            });
          } else if (varbinds && varbinds.length > 0 && !snmp.default.isVarbindError(varbinds[0])) {
            const sysDescr = varbinds[0].value?.toString() || '';
            resolve({
              success: true,
              data: {
                host: body.host,
                sysDescr,
                message: 'SNMP连接成功',
              },
              timestamp: new Date(),
            });
          } else {
            resolve({
              success: false,
              error: 'SNMP查询返回错误',
              timestamp: new Date(),
            });
          }
        });
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: `SNMP测试失败: ${err.message}`,
        timestamp: new Date(),
      });
    }
  });

  app.get('/api/snmp/status', async () => {
    const { isSnmpConfigured, getSnmpConfig, getSnmpTargets } = await import('../collectors/snmpCollector.js');
    const configured = await isSnmpConfigured();
    const targets = await getSnmpTargets();
    
    let singleTargetInfo = null;
    if (configured) {
      const config = await getSnmpConfig();
      singleTargetInfo = {
        host: config.host,
        port: config.port,
        community: config.community ? '****' : null,
        interval: config.timeout,
      };
    }
    
    return {
      success: true,
      data: {
        configured,
        mode: targets.length > 0 ? 'multi-target' : 'single-target',
        targetsCount: targets.length,
        activeTargets: targets.filter(t => t.enabled).length,
        singleTarget: singleTargetInfo,
        targets: targets.map(t => ({
          id: t.id,
          name: t.name,
          host: t.host,
          port: t.port,
          version: t.version,
          enabled: t.enabled,
          interval: t.interval,
        })),
      },
      timestamp: new Date(),
    };
  });

  // SNMP collection statistics
  app.get('/api/snmp/stats', async (_request, reply) => {
    try {
      const { query } = await import('../database/index.js');
      
      // Get last collection event
      const lastCollection = await query(
        `SELECT created_at, message FROM events 
         WHERE source = 'snmp' AND level = 'info' 
         ORDER BY created_at DESC LIMIT 1`
      );
      
      // Get last error event
      const lastError = await query(
        `SELECT created_at, message FROM events 
         WHERE source = 'snmp' AND level = 'error' 
         ORDER BY created_at DESC LIMIT 1`
      );
      
      // Get collection count in last hour
      const recentCollections = await query(
        `SELECT COUNT(*) as count FROM events 
         WHERE source = 'snmp' AND level = 'info' 
         AND created_at > NOW() - INTERVAL '1 hour'`
      );
      
      // Get error count in last hour
      const recentErrors = await query(
        `SELECT COUNT(*) as count FROM events 
         WHERE source = 'snmp' AND level = 'error' 
         AND created_at > NOW() - INTERVAL '1 hour'`
      );
      
      // Get total devices discovered via SNMP
      const snmpDevices = await query(
        `SELECT COUNT(*) as count FROM devices 
         WHERE id LIKE 'snmp-if-%' OR id LIKE '%-snmp-if-%'`
      );
      
      return {
        success: true,
        data: {
          lastCollection: (lastCollection as any[])[0] || null,
          lastError: (lastError as any[])[0] || null,
          collectionsLastHour: parseInt((recentCollections as any[])[0]?.count || '0'),
          errorsLastHour: parseInt((recentErrors as any[])[0]?.count || '0'),
          totalDevices: parseInt((snmpDevices as any[])[0]?.count || '0'),
          health: parseInt((recentErrors as any[])[0]?.count || '0') === 0 ? 'healthy' : 'degraded',
        },
        timestamp: new Date(),
      };
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: `获取SNMP统计失败: ${err.message}`,
        timestamp: new Date(),
      });
    }
  });

  // SNMP device discovery
  app.get('/api/snmp/devices', async (_request, reply) => {
    try {
      const { query } = await import('../database/index.js');
      
      const devices = await query(
        `SELECT id, name, type, ip_address, mac_address, interface_name, is_online, last_seen
         FROM devices 
         WHERE id LIKE 'snmp-if-%' OR id LIKE '%-snmp-if-%'
         ORDER BY last_seen DESC`
      );
      
      return {
        success: true,
        data: devices,
        timestamp: new Date(),
      };
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: `获取SNMP设备失败: ${err.message}`,
        timestamp: new Date(),
      });
    }
  });

// ============================================================
  // Events
  // ============================================================
  app.get('/api/events', async (request) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50');
    const events = await getRecentEvents(limit);
    return { success: true, data: events, timestamp: new Date() };
  });

  // ============================================================
  // History metrics
  // ============================================================
  app.get('/api/history/:metric', async (request) => {
    const params = request.params as { metric: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '60');
    const metrics = await getHistoryMetrics(params.metric, limit);
    return { success: true, data: metrics, timestamp: new Date() };
  });

  // ============================================================
  // Devices
  // ============================================================
  app.get('/api/devices', async () => {
    const devices = await getDevicesWithTraffic();
    return { success: true, data: devices, timestamp: new Date() };
  });

  // ============================================================
  // Topology
  // ============================================================
  app.get('/api/topology', async () => {
    const topology = await getTopology();
    return { success: true, data: topology, timestamp: new Date() };
  });

  // ============================================================
  // Dashboard metrics
  // ============================================================
  app.get('/api/metrics', async () => {
    const metrics = await getDashboardMetrics();
    return { success: true, data: metrics, timestamp: new Date() };
  });

  // ============================================================
  // ALERTS API
  // ============================================================

  /**
   * GET /api/alerts
   * Query params: status, severity, limit, offset
   */
  app.get('/api/alerts', async (request) => {
    const q = request.query as {
      status?: string;
      severity?: string;
      limit?: string;
      offset?: string;
    };

    const result = await alertManager.getAlerts({
      status: q.status as AlertStatus | undefined,
      severity: q.severity as Severity | undefined,
      limit: q.limit ? parseInt(q.limit) : 50,
      offset: q.offset ? parseInt(q.offset) : 0,
    });

    return {
      success: true,
      data: {
        alerts: result.alerts,
        total: result.total,
      },
      timestamp: new Date(),
    };
  });

  /**
   * GET /api/alerts/active-count
   * Returns number of currently active alerts.
   */
  app.get('/api/alerts/active-count', async () => {
    const count = await alertManager.getActiveAlertCount();
    return { success: true, data: { count }, timestamp: new Date() };
  });

  /**
   * GET /api/alerts/:id
   * Returns a single alert with its history timeline.
   */
  app.get('/api/alerts/:id', async (request, reply) => {
    const id = parseInt((request.params as any).id);
    if (isNaN(id)) {
      return reply.code(400).send({ success: false, error: 'Invalid alert id', timestamp: new Date() });
    }

    const alert = await alertManager.getAlert(id);
    if (!alert) {
      return reply.code(404).send({ success: false, error: 'Alert not found', timestamp: new Date() });
    }

    const history = await alertManager.getAlertHistory(id);
    return { success: true, data: { ...alert, history }, timestamp: new Date() };
  });

  /**
   * POST /api/alerts/:id/acknowledge
   * Acknowledge an active alert.
   */
  app.post('/api/alerts/:id/acknowledge', async (request, reply) => {
    const id = parseInt((request.params as any).id);
    if (isNaN(id)) {
      return reply.code(400).send({ success: false, error: 'Invalid alert id', timestamp: new Date() });
    }

    const alert = await alertManager.acknowledgeAlert(id, 'user');
    if (!alert) {
      return reply.code(404).send({ success: false, error: 'Alert not found or already resolved', timestamp: new Date() });
    }

    return { success: true, data: alert, timestamp: new Date() };
  });

  /**
   * POST /api/alerts/:id/resolve
   * Resolve an active or acknowledged alert.
   */
  app.post('/api/alerts/:id/resolve', async (request, reply) => {
    const id = parseInt((request.params as any).id);
    if (isNaN(id)) {
      return reply.code(400).send({ success: false, error: 'Invalid alert id', timestamp: new Date() });
    }

    const body = request.body as { reason?: string } | undefined;
    const alert = await alertManager.resolveAlert(id, 'user', body?.reason);
    if (!alert) {
      return reply.code(404).send({ success: false, error: 'Alert not found', timestamp: new Date() });
    }

    return { success: true, data: alert, timestamp: new Date() };
  });

  /**
   * GET /api/alerts/rules
   * Returns all configured alert rules.
   */
  app.get('/api/alerts/rules', async () => {
    const rules = alertRulesEngine.getRules();
    return { success: true, data: rules, timestamp: new Date() };
  });
}
