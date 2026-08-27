import type {
  FortiGateStatus,
  NetworkInterface,
  TrafficStats,
  VpnConnection,
  ConnectedDevice,
  NetworkEvent,
  DashboardMetrics,
  TopologyNode,
  TopologyEdge,
} from '@/types';

const API_BASE = 'http://' + window.location.hostname + ':3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

async function fetchApi<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(API_BASE + endpoint);
    const json: ApiResponse<T> = await res.json();
    return json.success ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

export async function getHealth(): Promise<{ status: string } | null> {
  return fetchApi('/api/health');
}

export async function getFortiGateSystem(): Promise<FortiGateStatus | null> {
  return fetchApi('/api/fortigate/system');
}

export async function getFortiGateTraffic(): Promise<TrafficStats | null> {
  return fetchApi('/api/fortigate/traffic');
}

export async function getFortiGateInterfaces(): Promise<NetworkInterface[]> {
  const result = await fetchApi<NetworkInterface[]>('/api/fortigate/interfaces');
  return result ?? [];
}

export async function getFortiGateVpn(): Promise<VpnConnection[]> {
  const result = await fetchApi<VpnConnection[]>('/api/fortigate/vpn');
  return result ?? [];
}

export async function getEvents(limit: number = 50): Promise<NetworkEvent[]> {
  const result = await fetchApi<NetworkEvent[]>('/api/events?limit=' + limit);
  return result ?? [];
}

export async function getHistoryMetrics(metricType: string, limit: number = 60): Promise<any[]> {
  const result = await fetchApi<any[]>('/api/history/' + metricType + '?limit=' + limit);
  return result ?? [];
}

export async function getDevices(): Promise<ConnectedDevice[]> {
  const result = await fetchApi<ConnectedDevice[]>('/api/devices');
  return result ?? [];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  return fetchApi('/api/metrics');
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export async function getTopology(): Promise<TopologyData | null> {
  return fetchApi('/api/topology');
}
