// 真正的 Mock 数据收集器 - 支持两台 FortiGate 设备

// 两台 FortiGate 设备数据
const fortigateDevices = [
  {
    id: 'fg-hq',
    name: 'FortiGate 30E (总部)',
    model: 'FortiGate-30E',
    serial: 'FGT30E5618046565',
    ip: '10.0.0.1',
    location: '总部',
    system: {
      cpu_usage: 25.5,
      memory_usage: 45.2,
      memory_total: 512,
      memory_used: 231,
      temperature: 42,
      session_count: 1250,
      session_rate: 45,
      packet_rate: 12500,
      firmware_version: 'v7.2.5',
      uptime_seconds: 864000, // 10 天
    },
    traffic: {
      interface_name: 'wan1',
      rx_bytes: 125000000,
      tx_bytes: 50000000,
    },
  },
  {
    id: 'fg-branch',
    name: 'FortiGate 30E (分部)',
    model: 'FortiGate-30E',
    serial: 'FGT30E7890123456',
    ip: '192.168.10.1',
    location: '分部',
    system: {
      cpu_usage: 18.3,
      memory_usage: 38.7,
      memory_total: 512,
      memory_used: 198,
      temperature: 38,
      session_count: 680,
      session_rate: 28,
      packet_rate: 8500,
      firmware_version: 'v7.2.5',
      uptime_seconds: 259200, // 3 天
    },
    traffic: {
      interface_name: 'wan1',
      rx_bytes: 85000000,
      tx_bytes: 35000000,
    },
  },
];

// VPN 隧道状态
let vpnTunnel = {
  name: 'IPSec-HQ-Branch',
  status: 'active' as const,
  remote_gateway: '192.168.10.1',
  bytes_in: 45000000,
  bytes_out: 32000000,
  uptime: 864000,
  phase1_name: 'to-branch',
  phase2_name: 'phase2-to-branch',
};

const mockEvents = [
  { id: 1, level: 'info', source: 'system', message: '系统启动完成', timestamp: new Date() },
  { id: 2, level: 'info', source: 'firewall', message: '防火墙规则已加载', timestamp: new Date() },
  { id: 3, level: 'info', source: 'vpn', message: 'IPSec VPN 隧道已建立 (总部 ↔ 分部)', timestamp: new Date() },
  { id: 4, level: 'info', source: 'dhcp', message: '新设备连接: MacBook Pro', timestamp: new Date() },
  { id: 5, level: 'info', source: 'wifi', message: 'Wi-Fi 客户端已连接', timestamp: new Date() },
];

let eventIdCounter = 10;

// 模拟数据变化
function updateDeviceData(device: typeof fortigateDevices[0]) {
  const sys = device.system;
  sys.cpu_usage = Math.min(100, Math.max(0, sys.cpu_usage + (Math.random() - 0.5) * 5));
  sys.memory_usage = Math.min(100, Math.max(0, sys.memory_usage + (Math.random() - 0.5) * 2));
  sys.session_count = Math.max(100, sys.session_count + Math.floor((Math.random() - 0.5) * 100));
  sys.temperature = Math.min(60, Math.max(35, sys.temperature + (Math.random() - 0.5) * 2));
  
  device.traffic.rx_bytes = Math.max(10000000, device.traffic.rx_bytes + Math.floor((Math.random() - 0.5) * 10000000));
  device.traffic.tx_bytes = Math.max(5000000, device.traffic.tx_bytes + Math.floor((Math.random() - 0.5) * 5000000));
}

export async function getFortigateDevices() {
  // 更新每台设备的数据
  fortigateDevices.forEach(updateDeviceData);
  
  // 更新 VPN 隧道数据
  vpnTunnel.bytes_in = Math.max(10000000, vpnTunnel.bytes_in + Math.floor((Math.random() - 0.5) * 5000000));
  vpnTunnel.bytes_out = Math.max(5000000, vpnTunnel.bytes_out + Math.floor((Math.random() - 0.5) * 3000000));
  
  return fortigateDevices.map(device => ({
    id: device.id,
    name: device.name,
    model: device.model,
    serial: device.serial,
    ip: device.ip,
    location: device.location,
    firmwareVersion: device.system.firmware_version,
    uptimeSeconds: device.system.uptime_seconds,
    status: 'online' as const,
    system: {
      cpu: device.system.cpu_usage,
      memory: device.system.memory_usage,
      memoryTotal: device.system.memory_total,
      memoryUsed: device.system.memory_used,
      temperature: device.system.temperature,
      sessionCount: device.system.session_count,
      sessionRate: device.system.session_rate,
      packetRate: device.system.packet_rate,
      firmwareVersion: device.system.firmware_version,
      uptimeSeconds: device.system.uptime_seconds,
      lastUpdate: new Date(),
    },
    traffic: {
      rxBytes: device.traffic.rx_bytes,
      txBytes: device.traffic.tx_bytes,
    },
  }));
}

export async function getVpnTunnel() {
  return {
    name: vpnTunnel.name,
    type: 'ipsec',
    status: vpnTunnel.status,
    remoteGateway: vpnTunnel.remote_gateway,
    bytesIn: vpnTunnel.bytes_in,
    bytesOut: vpnTunnel.bytes_out,
    uptime: vpnTunnel.uptime,
    phase1Name: vpnTunnel.phase1_name,
    phase2Name: vpnTunnel.phase2_name,
  };
}

// 保持向后兼容的单设备接口
export async function getLatestSystemStatus() {
  const devices = await getFortigateDevices();
  const mainDevice = devices[0];
  return {
    cpu_usage: mainDevice.system.cpu,
    memory_usage: mainDevice.system.memory,
    memory_total: mainDevice.system.memoryTotal,
    memory_used: mainDevice.system.memoryUsed,
    temperature: mainDevice.system.temperature,
    session_count: mainDevice.system.sessionCount,
    session_rate: mainDevice.system.sessionRate,
    packet_rate: mainDevice.system.packetRate,
    firmware_version: mainDevice.system.firmwareVersion,
    uptime_seconds: mainDevice.system.uptimeSeconds,
    id: Date.now(),
    timestamp: new Date(),
  };
}

export async function getLatestTrafficStats() {
  const devices = await getFortigateDevices();
  const mainDevice = devices[0];
  return {
    interface_name: 'wan1',
    rx_bytes: mainDevice.traffic.rxBytes,
    tx_bytes: mainDevice.traffic.txBytes,
    rx_packets: 100000,
    tx_packets: 50000,
    id: Date.now(),
    timestamp: new Date(),
  };
}

export async function getRecentEvents(limit: number = 50) {
  // 随机添加新事件
  if (Math.random() > 0.7) {
    const newEvents = [
      { level: 'info', source: 'firewall', message: `允许连接: 192.168.1.${Math.floor(Math.random() * 254) + 1}` },
      { level: 'info', source: 'dhcp', message: `DHCP 分配: 10.0.0.${Math.floor(Math.random() * 254) + 1}` },
      { level: 'info', source: 'vpn', message: 'IPSec VPN 隧道流量正常' },
      { level: 'info', source: 'system', message: 'CPU 使用率正常' },
    ];
    const newEvent = newEvents[Math.floor(Math.random() * newEvents.length)];
    mockEvents.push({
      id: eventIdCounter++,
      ...newEvent,
      timestamp: new Date(),
    });
  }
  
  return mockEvents.slice(-limit);
}

export async function getHistoryMetrics(metricType: string, limit: number = 60) {
  // 生成历史数据
  const history = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    history.push({
      id: now - i * 5000,
      metric_type: metricType,
      value: Math.random() * 100,
      timestamp: new Date(now - i * 5000),
    });
  }
  return history;
}

export async function getTopology() {
  const devices = await getFortigateDevices();
  return {
    nodes: [
      // 总部网络
      { id: 'internet', type: 'internet', data: { label: 'Internet', status: 'online', icon: 'Globe' }, position: { x: 400, y: 0 } },
      { id: 'wan-hq', type: 'interface', data: { label: 'WAN (总部)', status: 'online', icon: 'Wifi' }, position: { x: 400, y: 80 } },
      { id: 'fortigate-hq', type: 'fortigate', data: { label: 'FortiGate 30E (总部)', status: 'online', icon: 'Shield', details: { ip: '10.0.0.1' } }, position: { x: 400, y: 180 } },
      { id: 'lan-hq', type: 'interface', data: { label: 'LAN (总部)', status: 'online', icon: 'Network' }, position: { x: 250, y: 320 } },
      { id: 'wifi-hq', type: 'interface', data: { label: 'Wi-Fi (总部)', status: 'online', icon: 'Wifi' }, position: { x: 550, y: 320 } },
      { id: 'switch-hq', type: 'switch', data: { label: 'Switch (总部)', status: 'online', icon: 'Server' }, position: { x: 250, y: 450 } },
      { id: 'ap-hq', type: 'ap', data: { label: 'AP (总部)', status: 'online', icon: 'Wifi' }, position: { x: 550, y: 450 } },
      
      // VPN 隧道
      { id: 'vpn-tunnel', type: 'vpn', data: { label: 'IPSec VPN', status: 'online', icon: 'Shield' }, position: { x: 400, y: 250 } },
      
      // 分部网络
      { id: 'wan-branch', type: 'interface', data: { label: 'WAN (分部)', status: 'online', icon: 'Wifi' }, position: { x: 700, y: 80 } },
      { id: 'fortigate-branch', type: 'fortigate', data: { label: 'FortiGate 30E (分部)', status: 'online', icon: 'Shield', details: { ip: '192.168.10.1' } }, position: { x: 700, y: 180 } },
      { id: 'lan-branch', type: 'interface', data: { label: 'LAN (分部)', status: 'online', icon: 'Network' }, position: { x: 700, y: 320 } },
      { id: 'switch-branch', type: 'switch', data: { label: 'Switch (分部)', status: 'online', icon: 'Server' }, position: { x: 700, y: 450 } },
      
      // 设备
      { id: 'device-mac', type: 'device', data: { label: 'MacBook Pro', status: 'online', icon: 'Laptop' }, position: { x: 150, y: 580 } },
      { id: 'device-pc', type: 'device', data: { label: 'Desktop-PC', status: 'online', icon: 'Monitor' }, position: { x: 250, y: 580 } },
      { id: 'device-nas', type: 'device', data: { label: 'NAS-Synology', status: 'online', icon: 'HardDrive' }, position: { x: 350, y: 580 } },
      { id: 'device-iphone', type: 'device', data: { label: 'iPhone 15 Pro', status: 'online', icon: 'Smartphone' }, position: { x: 550, y: 580 } },
      { id: 'device-ipad', type: 'device', data: { label: 'iPad Air', status: 'online', icon: 'Tablet' }, position: { x: 650, y: 580 } },
      { id: 'device-branch-pc', type: 'device', data: { label: '分部-PC', status: 'online', icon: 'Monitor' }, position: { x: 750, y: 580 } },
    ],
    edges: [
      // 总部连接
      { id: 'e-internet-wan-hq', source: 'internet', target: 'wan-hq', animated: true },
      { id: 'e-wan-hq-fortigate', source: 'wan-hq', target: 'fortigate-hq', animated: true },
      { id: 'e-fortigate-lan-hq', source: 'fortigate-hq', target: 'lan-hq', animated: true },
      { id: 'e-fortigate-wifi-hq', source: 'fortigate-hq', target: 'wifi-hq', animated: true },
      { id: 'e-lan-hq-switch', source: 'lan-hq', target: 'switch-hq' },
      { id: 'e-wifi-hq-ap', source: 'wifi-hq', target: 'ap-hq' },
      
      // VPN 隧道连接
      { id: 'e-fortigate-hq-vpn', source: 'fortigate-hq', target: 'vpn-tunnel', animated: true },
      { id: 'e-vpn-fortigate-branch', source: 'vpn-tunnel', target: 'fortigate-branch', animated: true },
      
      // 分部连接
      { id: 'e-internet-wan-branch', source: 'internet', target: 'wan-branch', animated: true },
      { id: 'e-wan-branch-fortigate', source: 'wan-branch', target: 'fortigate-branch', animated: true },
      { id: 'e-fortigate-lan-branch', source: 'fortigate-branch', target: 'lan-branch', animated: true },
      { id: 'e-lan-branch-switch', source: 'lan-branch', target: 'switch-branch' },
      
      // 设备连接
      { id: 'e-switch-hq-mac', source: 'switch-hq', target: 'device-mac' },
      { id: 'e-switch-hq-pc', source: 'switch-hq', target: 'device-pc' },
      { id: 'e-switch-hq-nas', source: 'switch-hq', target: 'device-nas' },
      { id: 'e-ap-hq-iphone', source: 'ap-hq', target: 'device-iphone' },
      { id: 'e-ap-hq-ipad', source: 'ap-hq', target: 'device-ipad' },
      { id: 'e-switch-branch-pc', source: 'switch-branch', target: 'device-branch-pc' },
    ],
  };
}

export async function getDashboardMetrics() {
  const devices = await getFortigateDevices();
  const totalSessions = devices.reduce((sum, d) => sum + d.system.sessionCount, 0);
  const totalTraffic = devices.reduce((sum, d) => sum + d.traffic.rxBytes + d.traffic.txBytes, 0);
  
  return {
    wanDown: totalTraffic * 8,
    wanUp: totalTraffic * 4,
    onlineDevices: 10,
    vpnConnections: 1,
    activeSessions: totalSessions,
    cpuUsage: devices[0].system.cpu,
    memoryUsage: devices[0].system.memory,
    wanLatency: Math.floor(Math.random() * 20) + 5,
  };
}

export async function getDevicesWithTraffic() {
  const devices = await getFortigateDevices();
  const allDevices = [];
  
  // 总部设备
  allDevices.push(
    { id: 'dev-1', name: 'MacBook Pro', type: 'mac', ip_address: '10.0.0.101', mac_address: 'AA:BB:CC:DD:EE:10', interface_name: 'lan1', is_online: true, location: '总部' },
    { id: 'dev-2', name: 'iPhone 15 Pro', type: 'iphone', ip_address: '10.0.2.101', mac_address: 'AA:BB:CC:DD:EE:11', interface_name: 'wifi', is_online: true, location: '总部' },
    { id: 'dev-3', name: 'iPad Air', type: 'iphone', ip_address: '10.0.2.102', mac_address: 'AA:BB:CC:DD:EE:12', interface_name: 'wifi', is_online: true, location: '总部' },
    { id: 'dev-4', name: 'Desktop-PC', type: 'pc', ip_address: '10.0.0.103', mac_address: 'AA:BB:CC:DD:EE:13', interface_name: 'lan1', is_online: true, location: '总部' },
    { id: 'dev-5', name: 'NAS-Synology', type: 'nas', ip_address: '10.0.0.104', mac_address: 'AA:BB:CC:DD:EE:14', interface_name: 'lan1', is_online: true, location: '总部' },
  );
  
  // 分部设备
  allDevices.push(
    { id: 'dev-6', name: '分部-PC', type: 'pc', ip_address: '192.168.10.101', mac_address: 'AA:BB:CC:DD:EE:20', interface_name: 'lan1', is_online: true, location: '分部' },
    { id: 'dev-7', name: '分部-笔记本', type: 'pc', ip_address: '192.168.10.102', mac_address: 'AA:BB:CC:DD:EE:21', interface_name: 'lan1', is_online: true, location: '分部' },
    { id: 'dev-8', name: '分部-打印机', type: 'printer', ip_address: '192.168.10.103', mac_address: 'AA:BB:CC:DD:EE:22', interface_name: 'lan1', is_online: true, location: '分部' },
  );
  
  return allDevices;
}
