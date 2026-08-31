// Mock 模式启动文件 - 支持两台 FortiGate 设备

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

// 导入 mock 数据
import {
  getFortigateDevices,
  getVpnTunnel,
  getLatestSystemStatus,
  getLatestTrafficStats,
  getRecentEvents,
  getTopology,
  getDevicesWithTraffic,
  getDashboardMetrics,
} from './collectors/trueMockCollector.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });

  // ============================================================
  // API 路由
  // ============================================================
  
  app.get('/api/health', async () => {
    return { status: 'ok', mode: 'mock', timestamp: new Date() };
  });

  // 系统状态（主设备）
  app.get('/api/status', async () => {
    const systemStatus = await getLatestSystemStatus();
    const trafficStats = await getLatestTrafficStats();
    return { success: true, data: { system: systemStatus, traffic: trafficStats }, timestamp: new Date() };
  });

  // 仪表盘指标
  app.get('/api/metrics', async () => {
    const metrics = await getDashboardMetrics();
    return { success: true, data: metrics, timestamp: new Date() };
  });

  // 事件日志
  app.get('/api/events', async (request) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50');
    const events = await getRecentEvents(limit);
    return { success: true, data: events, timestamp: new Date() };
  });

  // 设备列表
  app.get('/api/devices', async () => {
    const devices = await getDevicesWithTraffic();
    return { success: true, data: devices, timestamp: new Date() };
  });

  // 网络拓扑
  app.get('/api/topology', async () => {
    const topology = await getTopology();
    return { success: true, data: topology, timestamp: new Date() };
  });

  // ============================================================
  // FortiGate 多设备 API
  // ============================================================
  
  // 获取所有 FortiGate 设备列表
  app.get('/api/fortigate/devices', async () => {
    const devices = await getFortigateDevices();
    return { 
      success: true, 
      data: devices,
      timestamp: new Date() 
    };
  });

  // 获取单台 FortiGate 详情
  app.get('/api/fortigate/device/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const devices = await getFortigateDevices();
    const device = devices.find(d => d.id === id);
    
    if (!device) {
      return reply.code(404).send({ success: false, error: '设备不存在', timestamp: new Date() });
    }
    
    return { success: true, data: device, timestamp: new Date() };
  });

  // VPN 隧道状态
  app.get('/api/fortigate/vpn', async () => {
    const tunnel = await getVpnTunnel();
    return { success: true, data: [tunnel], timestamp: new Date() };
  });

  // 兼容旧接口 - 返回主设备状态
  app.get('/api/fortigate/status', async () => {
    return { 
      success: true, 
      data: { 
        configured: true, 
        mode: 'mock',
        deviceCount: 2,
        message: 'Mock 模式 - 两台 FortiGate 30E' 
      }, 
      timestamp: new Date() 
    };
  });

  app.get('/api/fortigate/system', async () => {
    const devices = await getFortigateDevices();
    const mainDevice = devices[0];
    return {
      success: true,
      data: mainDevice,
      timestamp: new Date(),
    };
  });

  app.get('/api/fortigate/interfaces', async () => {
    return {
      success: true,
      data: [
        { name: 'wan1', status: 'up', ip: '203.0.113.1', speed: 1000, rxBytes: 125000000, txBytes: 50000000 },
        { name: 'lan1', status: 'up', ip: '10.0.0.1', speed: 1000, rxBytes: 80000000, txBytes: 75000000 },
        { name: 'lan2', status: 'up', ip: '10.0.1.1', speed: 1000, rxBytes: 20000000, txBytes: 15000000 },
        { name: 'wifi', status: 'up', ip: '10.0.2.1', speed: 1000, rxBytes: 50000000, txBytes: 45000000 },
      ],
      timestamp: new Date(),
    };
  });

  // SNMP 设备
  app.get('/api/snmp/devices', async () => {
    const devices = await getDevicesWithTraffic();
    return { success: true, data: devices, timestamp: new Date() };
  });

  app.get('/api/snmp/status', async () => {
    return {
      success: true,
      data: { configured: false, mode: 'mock' },
      timestamp: new Date(),
    };
  });

  app.get('/api/snmp/stats', async () => {
    return {
      success: true,
      data: {
        lastCollection: { created_at: new Date().toISOString(), message: 'Mock 数据' },
        collectionsLastHour: 120,
        errorsLastHour: 0,
        totalDevices: 8,
        health: 'healthy',
      },
      timestamp: new Date(),
    };
  });

  // ============================================================
  // 启动服务器
  // ============================================================
  const server = await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 Mock 模式服务器启动: http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket 地址: ws://${HOST}:3002`);
  console.log(`🖥️  前端地址: http://localhost:3000`);

  
  // ============================================================
  // WebSocket 服务器（直接实现，避免数据库依赖）
  // ============================================================
  const clients = new Set<WebSocket>();
  
  const wss = new WebSocketServer({ port: 3002 });
  
  wss.on('connection', async (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    // 发送初始数据
    try {
      const devices = await getFortigateDevices();
      const vpnTunnel = await getVpnTunnel();
      const recentEvents = await getRecentEvents(10);
      const topology = await getTopology();
      const deviceList = await getDevicesWithTraffic();
      
      ws.send(JSON.stringify({ type: 'fortigate_devices', data: devices, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'vpn_tunnel', data: vpnTunnel, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'system_status', data: {
        cpu_usage: devices[0].system.cpu,
        memory_usage: devices[0].system.memory,
        session_count: devices[0].system.sessionCount,
      }, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'event', data: recentEvents, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'topology_update', data: topology, timestamp: new Date() }));
      ws.send(JSON.stringify({ type: 'device_update', data: deviceList, timestamp: new Date() }));
    } catch (err) {
      console.error('Error sending initial data:', err);
    }
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
  });
  
  console.log('WebSocket server initialized on port 3002');
  
  function broadcastToClients(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: new Date() });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(message); } catch (err) { console.error('Error broadcasting:', err); }
      }
    });
  }


  // 每 5 秒广播数据
  setInterval(async () => {
    try {
      const devices = await getFortigateDevices();
      const vpnTunnel = await getVpnTunnel();
      const recentEvents = await getRecentEvents(10);
      const topology = await getTopology();
      const deviceList = await getDevicesWithTraffic();

      // 广播主设备状态（兼容旧版本）
      broadcastToClients('system_status', {
        cpu_usage: devices[0].system.cpu,
        memory_usage: devices[0].system.memory,
        session_count: devices[0].system.sessionCount,
        temperature: devices[0].system.temperature,
        firmware_version: devices[0].system.firmwareVersion,
        uptime_seconds: devices[0].system.uptimeSeconds,
      });

      // 广播多设备数据
      broadcastToClients('fortigate_devices', devices);
      broadcastToClients('vpn_tunnel', vpnTunnel);
      broadcastToClients('event', recentEvents);
      broadcastToClients('topology_update', topology);
      broadcastToClients('device_update', deviceList);
    } catch (err) {
      console.error('Error broadcasting updates:', err);
    }
  }, 5000);

  console.log('✅ Mock 数据广播已启动 (每 5 秒更新)');
  console.log('🎯 两台 FortiGate 30E 通过 IPSec VPN 互联');
  console.log('📊 总部: 10.0.0.1 | 分部: 192.168.10.1');

  process.on('SIGINT', async () => { process.exit(0); });
  process.on('SIGTERM', async () => { process.exit(0); });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
