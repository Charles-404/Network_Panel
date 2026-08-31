import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './api/routes.js';
import { registerSettingsRoutes } from './settings/routes.js';
import { registerAuthRoutes } from './auth/routes.js';
import { initWebSocket, broadcastToClients } from './websocket/index.js';
import { getLatestSystemStatus, getLatestTrafficStats, getRecentEvents, getTopology, getDevicesWithTraffic } from './collectors/mockCollector.js';
import { startFortiGateCollector, isFortiGateConfigured } from './collectors/fortigateCollector.js';
import { startSnmpCollector, isSnmpConfigured } from './collectors/snmpCollector.js';
import { startSyslogServer, stopSyslogServer } from './syslog/index.js';
import { alertRulesEngine } from './alerts/rules.js';
import { alertManager } from './alerts/manager.js';
import dotenv from 'dotenv';

// Import production utilities
import logger, { createChildLogger } from './utils/logger.js';
import { registerErrorHandler } from './utils/errors.js';
import { registerRateLimiter } from './middleware/rateLimiter.js';
import { registerRequestLogger, registerPerformanceMonitor } from './middleware/requestLogger.js';

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
const appLogger = createChildLogger('server');

// Alert evaluation interval (ms)
const ALERT_EVAL_INTERVAL = 15_000; // 15 seconds

async function start(): Promise<void> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production', // 使用 Fastify 内置日志（开发环境）
    requestIdLogLabel: 'requestId',
    requestIdHeader: 'x-request-id',
    trustProxy: true, // 信任代理以获取真实 IP
  });

  // ============================================================
  // 注册全局中间件（按顺序）
  // ============================================================

  // 1. 错误处理（必须最先注册）
  registerErrorHandler(app);

  // 2. CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  // 3. 速率限制
  await registerRateLimiter(app);

  // 4. 请求日志
  await registerRequestLogger(app);

  // 5. 性能监控（响应时间超过 2 秒告警）
  await registerPerformanceMonitor(app, 2000);

  // ============================================================
  // 注册路由
  // ============================================================
  await registerAuthRoutes(app);
  await registerRoutes(app);
  await registerSettingsRoutes(app);

  // ============================================================
  // 启动服务器
  // ============================================================
  const server = await app.listen({ port: PORT, host: HOST });
  appLogger.info({ host: HOST, port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');

  initWebSocket(server as any);

  // ---- Initialize alert rules engine ----
  appLogger.info('Initializing alert rules engine...');
  await alertRulesEngine.loadRules();
  appLogger.info({ ruleCount: alertRulesEngine.getRules.length }, 'Alert rules loaded');

  // ---- Start FortiGate collector if configured ----
  if (isFortiGateConfigured()) {
    appLogger.info('FortiGate detected, starting real data collection...');
    startFortiGateCollector(5000);
  } else {
    appLogger.warn('FortiGate not configured. Set FORTIGATE_HOST and FORTIGATE_TOKEN in .env');
  }

  // ---- Start SNMP collector if configured ----
  if (await isSnmpConfigured()) {
    appLogger.info('SNMP target detected, starting SNMP collection...');
    await startSnmpCollector(parseInt(process.env.SNMP_INTERVAL || '30000'));
  } else {
    appLogger.info('SNMP not configured (optional). Set SNMP_HOST in .env or configure in Settings.');
  }

  // ---- Broadcast system data every 5 seconds ----
  setInterval(async () => {
    try {
      const systemStatus = await getLatestSystemStatus();
      const trafficStats = await getLatestTrafficStats();
      const recentEvents = await getRecentEvents(10);
      const topology = await getTopology();
      const devices = await getDevicesWithTraffic();

      broadcastToClients('system_status', systemStatus);
      broadcastToClients('traffic_update', trafficStats);
      broadcastToClients('event', recentEvents);
      broadcastToClients('topology_update', topology);
      broadcastToClients('device_update', devices);

      // Broadcast active alert count to clients
      const activeAlertCount = await alertManager.getActiveAlertCount();
      broadcastToClients('alert_count', { count: activeAlertCount });
    } catch (err) {
      appLogger.error({ err }, 'Error broadcasting updates');
    }
  }, 5000);

  // ---- Alert evaluation loop ----
  setInterval(async () => {
    try {
      const systemStatus = await getLatestSystemStatus();
      const devices = await getDevicesWithTraffic();

      // Evaluate rules
      const results = await alertRulesEngine.evaluateAll({
        systemStatus: systemStatus as any,
        devices: devices as any,
        interfaces: [],
        vpnConnections: [],
      });

      // Process triggered rules → create/update alerts
      const newAlerts = await alertManager.processEvaluationResults(results);

      // Broadcast new alerts to connected clients
      if (newAlerts.length > 0) {
        for (const alert of newAlerts) {
          broadcastToClients('alert', alert);
        }
        // Also broadcast updated count
        const count = await alertManager.getActiveAlertCount();
        broadcastToClients('alert_count', { count });
        appLogger.info({ count: newAlerts.length }, 'New alerts triggered');
      }
    } catch (err) {
      appLogger.error({ err }, 'Alert evaluation error');
    }
  }, ALERT_EVAL_INTERVAL);

  // ---- Periodic: purge old resolved alerts (every hour) ----
  setInterval(async () => {
    try {
      const purged = await alertManager.purgeOldAlerts(30);
      if (purged > 0) {
        appLogger.info({ purged }, 'Purged old resolved alerts');
      }
    } catch (err) {
      appLogger.error({ err }, 'Alert purge error');
    }
  }, 3600_000);

  // ---- Start Syslog server if enabled ----
  if (process.env.SYSLOG_ENABLED !== 'false') {
    const syslogPort = parseInt(process.env.SYSLOG_PORT || '514');
    appLogger.info({ port: syslogPort }, 'Starting Syslog server...');
    await startSyslogServer(syslogPort);
  }

  // ---- Graceful shutdown ----
  const shutdown = async (signal: string) => {
    appLogger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

    try {
      await stopSyslogServer();
      await app.close();
      appLogger.info('Server closed gracefully');
      process.exit(0);
    } catch (err) {
      appLogger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
