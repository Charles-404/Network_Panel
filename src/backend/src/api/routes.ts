import type { FastifyInstance } from 'fastify';
import { getLatestSystemStatus, getLatestTrafficStats, getRecentEvents, getHistoryMetrics, getTopology, getDashboardMetrics, getDevicesWithTraffic } from '../collectors/mockCollector.js';
import { getFortiGateAdapter } from '../fortigate/adapter.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date() };
  });

  app.get('/api/status', async () => {
    const systemStatus = await getLatestSystemStatus();
    const trafficStats = await getLatestTrafficStats();
    return { success: true, data: { system: systemStatus, traffic: trafficStats }, timestamp: new Date() };
  });

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
      // Map cmdb format to frontend format
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
      // Merge monitor data with config
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

  app.get('/api/events', async (request) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50');
    const events = await getRecentEvents(limit);
    return { success: true, data: events, timestamp: new Date() };
  });

  app.get('/api/history/:metric', async (request) => {
    const params = request.params as { metric: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '60');
    const metrics = await getHistoryMetrics(params.metric, limit);
    return { success: true, data: metrics, timestamp: new Date() };
  });

  app.get('/api/devices', async () => {
    const devices = await getDevicesWithTraffic();
    return { success: true, data: devices, timestamp: new Date() };
  });

  app.get('/api/topology', async () => {
    const topology = await getTopology();
    return { success: true, data: topology, timestamp: new Date() };
  });

  app.get('/api/metrics', async () => {
    const metrics = await getDashboardMetrics();
    return { success: true, data: metrics, timestamp: new Date() };
  });
}
