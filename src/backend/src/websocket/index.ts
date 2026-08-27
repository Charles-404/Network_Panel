import { WebSocketServer, WebSocket } from 'ws';
import { getLatestSystemStatus, getLatestTrafficStats, getRecentEvents, getTopology, getDevicesWithTraffic } from '../collectors/mockCollector.js';

let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();

export function initWebSocket(_server: any): void {
  wss = new WebSocketServer({ port: 3002 });

  wss.on('connection', async (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    try {
      const systemStatus = await getLatestSystemStatus();
      const trafficStats = await getLatestTrafficStats();
      const recentEvents = await getRecentEvents(10);
      const topology = await getTopology();
      const devices = await getDevicesWithTraffic();

      // Send initial data as individual messages the frontend expects
      if (systemStatus) {
        ws.send(JSON.stringify({ type: 'system_status', data: systemStatus, timestamp: new Date() }));
      }
      if (trafficStats) {
        ws.send(JSON.stringify({ type: 'traffic_update', data: trafficStats, timestamp: new Date() }));
      }
      if (recentEvents && recentEvents.length > 0) {
        ws.send(JSON.stringify({ type: 'event', data: recentEvents, timestamp: new Date() }));
      }
      ws.send(JSON.stringify({ type: 'topology_update', data: topology, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'device_update', data: devices, timestamp: new Date() }));
    } catch (err) {
      console.error('Error sending initial data:', err);
    }

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket received:', data.type);
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  console.log('WebSocket server initialized on port 3002');
}

export function broadcastToClients(type: string, data: unknown): void {
  const message = JSON.stringify({ type, data, timestamp: new Date() });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(message); } catch (err) { console.error('Error broadcasting:', err); }
    }
  });
}

export function getConnectedClients(): number {
  return clients.size;
}
