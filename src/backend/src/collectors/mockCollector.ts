import { getOne, getAll } from '../database/index.js';

export async function getLatestSystemStatus() {
  return getOne('SELECT * FROM system_status ORDER BY id DESC LIMIT 1');
}

export async function getLatestTrafficStats() {
  return getOne('SELECT * FROM traffic_stats ORDER BY id DESC LIMIT 1');
}

export async function getRecentEvents(limit: number = 50) {
  return getAll('SELECT * FROM events ORDER BY id DESC LIMIT $1', [limit]);
}

export async function getHistoryMetrics(metricType: string, limit: number = 60) {
  return getAll('SELECT * FROM history_metrics WHERE metric_type = $1 ORDER BY id DESC LIMIT $2', [metricType, limit]);
}

export async function getTopologyNodes() {
  return getAll('SELECT * FROM topology_nodes ORDER BY id');
}

export async function getTopologyEdges() {
  return getAll('SELECT * FROM topology_edges ORDER BY id');
}

export async function getTopology() {
  const nodes = await getTopologyNodes();
  const edges = await getTopologyEdges();
  return {
    nodes: nodes.map((n: any) => ({
      id: n.id,
      type: n.type,
      data: {
        label: n.label,
        status: n.status,
        icon: n.icon,
        details: n.details ? (typeof n.details === 'string' ? JSON.parse(n.details) : n.details) : undefined,
      },
      position: { x: n.pos_x, y: n.pos_y },
    })),
    edges: edges.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated,
    })),
  };
}

export async function getDashboardMetrics() {
  const systemStatus = await getLatestSystemStatus() as any;
  const trafficStats = await getLatestTrafficStats() as any;
  const devices = await getAll('SELECT * FROM devices WHERE is_online = true') as any[];
  return {
    // traffic_stats now stores speed in bytes/sec, convert to bps for display
    wanDown: trafficStats ? parseInt(trafficStats.tx_bytes) || 0 : 0,
    wanUp: trafficStats ? parseInt(trafficStats.rx_bytes) || 0 : 0,
    onlineDevices: devices.length,
    vpnConnections: 0,
    activeSessions: systemStatus ? parseInt(systemStatus.session_count) || 0 : 0,
    cpuUsage: systemStatus ? parseFloat(systemStatus.cpu_usage) || 0 : 0,
    memoryUsage: systemStatus ? parseFloat(systemStatus.memory_usage) || 0 : 0,
    wanLatency: 0,
  };
}

export async function getDevicesWithTraffic() {
  const rows = await getAll('SELECT * FROM devices ORDER BY last_seen DESC') as any[];
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    ipAddress: r.ip_address || '',
    macAddress: r.mac_address || '',
    interface: r.interface_name || '',
    isOnline: r.is_online,
    lastSeen: r.last_seen,
  }));
}
