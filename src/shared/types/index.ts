export type DeviceType = 'fortigate' | 'switch' | 'ap' | 'router' | 'server' | 'nas' | 'pc' | 'mac' | 'iphone' | 'android' | 'iot' | 'printer' | 'other';

export type InterfaceStatus = 'up' | 'down' | 'disabled' | 'monitoring';

export type VpnType = 'ipsec' | 'ssl-vpn' | 'wireguard';
export type VpnStatus = 'active' | 'inactive' | 'error';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged';

export type EventLevel = 'info' | 'warning' | 'error' | 'critical';

export interface SystemStatus {
  cpu: number;
  memory: number;
  memoryTotal: number;
  memoryUsed: number;
  temperature: number;
  sessionCount: number;
  sessionRate: number;
  packetRate: number;
  firmwareVersion: string;
  uptimeSeconds: number;
  lastUpdate: Date;
}

export interface FortiGateStatus {
  name: string;
  model: string;
  serial: string;
  firmwareVersion: string;
  uptimeSeconds: number;
  status: 'online' | 'offline' | 'warning';
  system: SystemStatus;
}

export interface NetworkInterface {
  name: string;
  status: InterfaceStatus;
  ip?: string;
  mask?: string;
  gateway?: string;
  mac?: string;
  speed?: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  lastUpdate: Date;
}

export interface TrafficStats {
  interfaceName: string;
  rxBytes: number;
  txBytes: number;
  rxRate: number;
  txRate: number;
  timestamp: Date;
}

export interface VpnConnection {
  id: string;
  name: string;
  type: VpnType;
  remoteGateway?: string;
  bytesIn: number;
  bytesOut: number;
  uptime: number;
  status: VpnStatus;
  lastUpdate: Date;
}

export interface NetworkSession {
  id: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  bytesSent: number;
  bytesReceived: number;
  duration: number;
  state: string;
  lastUpdate: Date;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  macAddress?: string;
  interface?: string;
  isOnline: boolean;
  lastSeen: Date;
  traffic?: {
    rxBytes: number;
    txBytes: number;
    rxRate: number;
    txRate: number;
  };
}

export interface NetworkEvent {
  id: string;
  level: EventLevel;
  source: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface TopologyNode {
  id: string;
  type: string;
  data: {
    label: string;
    status?: 'online' | 'offline' | 'warning';
    icon?: string;
    details?: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface DashboardMetrics {
  wanDown: number;
  wanUp: number;
  onlineDevices: number;
  vpnConnections: number;
  activeSessions: number;
  cpuUsage: number;
  memoryUsage: number;
  wanLatency: number;
}

export type WsMessageType =
  | 'system_status'
  | 'traffic_update'
  | 'device_update'
  | 'session_update'
  | 'vpn_update'
  | 'event'
  | 'alert'
  | 'topology_update';

export interface WsMessage {
  type: WsMessageType;
  data: unknown;
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
