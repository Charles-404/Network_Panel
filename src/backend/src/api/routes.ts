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
