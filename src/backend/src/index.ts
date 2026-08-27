import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './api/routes.js';
import { initWebSocket, broadcastToClients } from './websocket/index.js';
import { getLatestSystemStatus, getLatestTrafficStats, getRecentEvents, getTopology, getDevicesWithTraffic } from './collectors/mockCollector.js';
import { startFortiGateCollector, isFortiGateConfigured } from './collectors/fortigateCollector.js';
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await registerRoutes(app);

  const server = await app.listen({ port: PORT, host: HOST });
  console.log('Server running at http://' + HOST + ':' + PORT);

  initWebSocket(server as any);

  if (isFortiGateConfigured()) {
    console.log('FortiGate detected, starting real data collection...');
    startFortiGateCollector(5000);
  } else {
    console.log('WARNING: FortiGate not configured. Set FORTIGATE_HOST and FORTIGATE_TOKEN in .env');
  }

  // Broadcast updates every 5 seconds
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
    } catch (err) {
      console.error('Error broadcasting updates:', err);
    }
  }, 5000);

  process.on('SIGINT', async () => { process.exit(0); });
  process.on('SIGTERM', async () => { process.exit(0); });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
