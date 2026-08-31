import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Download, Upload, Users, Shield, Activity, Cpu, MemoryStick, Clock } from 'lucide-react';
import { Header } from './Header';
import { MetricCard } from '@/components/cards/MetricCard';
import { FortiGateCard } from '@/components/cards/FortiGateCard';
import { NetworkTopology } from '@/components/topology/NetworkTopology';
import { TrafficChart } from '@/components/charts/TrafficChart';
import { SystemChart } from '@/components/charts/SystemChart';
import { EventLog } from '@/components/events/EventLog';
import { DeviceList } from '@/components/devices/DeviceList';
import { formatBits, formatNumber, formatDuration } from '@/lib/utils';
import type { TopologyNode, TopologyEdge, ConnectedDevice } from '@/types';
import { AlertPanel } from '@/components/alerts/AlertPanel';

const API_BASE = 'http://' + window.location.hostname + ':3001';
const WS_URL = 'ws://' + window.location.hostname + ':3002';

// Shallow equality check for objects
function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const k of keysA) { if (a[k] !== b[k]) return false; }
  return true;
}

// Memoized child wrappers to prevent unnecessary re-renders
const MemoMetricCard = memo(MetricCard);
const MemoFortiGateCard = memo(FortiGateCard);
const MemoNetworkTopology = memo(NetworkTopology);
const MemoTrafficChart = memo(TrafficChart);
const MemoSystemChart = memo(SystemChart);
const MemoEventLog = memo(EventLog);
const MemoAlertPanel = memo(AlertPanel);
const MemoDeviceList = memo(DeviceList);

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    wanDown: 0, wanUp: 0, onlineDevices: 0, vpnConnections: 0,
    activeSessions: 0, cpuUsage: 0, memoryUsage: 0, wanLatency: 0,
  });
  const [fortiGate, setFortiGate] = useState<any>(null);
  const [fortigateDevices, setFortigateDevices] = useState<any[]>([]);
  const [vpnTunnel, setVpnTunnel] = useState<any>(null);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [topology, setTopology] = useState<{ nodes: TopologyNode[]; edges: TopologyEdge[] }>({ nodes: [], edges: [] });
  const [isConnected, setIsConnected] = useState(false);

  // Refs to track previous values - avoid re-render when data unchanged
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<Record<string, any>>({});

  // Batch state updates in next animation frame to avoid multiple re-renders
  const scheduleUpdate = useCallback((key: string, updater: () => void) => {
    pendingRef.current[key] = updater;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const updates = Object.values(pendingRef.current);
        pendingRef.current = {};
        // React 18 automatic batching handles multiple setState calls
        for (const fn of updates) fn();
      });
    }
  }, []);

    // WebSocket connection with auto-reconnect
  const wsRef = useRef<WebSocket | null>(null);
  
  const connectWebSocket = useCallback(() => {
    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      // 自动重连
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'system_status' && msg.data) {
          const d = msg.data;
          const cpu = parseFloat(d.cpu_usage) || 0;
          const mem = parseFloat(d.memory_usage) || 0;
          const sessions = parseInt(d.session_count) || 0;
          scheduleUpdate('metrics', () => {
            setMetrics(prev => {
              const next = { ...prev, cpuUsage: cpu, memoryUsage: mem, activeSessions: sessions };
              return shallowEqual(prev, next) ? prev : next;
            });
          });
          scheduleUpdate('fortigate', () => {
            setFortiGate((prev: any) => {
              const next = {
                name: prev?.name || 'FortiGate 30E',
                model: prev?.model || 'FortiGate-30E',
                serial: prev?.serial || 'FGT30E5618046565',
                status: 'online',
                firmwareVersion: d.firmware_version || prev?.firmwareVersion || 'v6.2.16',
                uptimeSeconds: parseInt(d.uptime_seconds) || prev?.uptimeSeconds || 0,
                system: {
                  cpu, memory: mem,
                  memoryTotal: parseInt(d.memory_total) || prev?.system?.memoryTotal || 0,
                  memoryUsed: parseInt(d.memory_used) || prev?.system?.memoryUsed || 0,
                  temperature: parseFloat(d.temperature) || prev?.system?.temperature || 0,
                  sessionCount: sessions,
                  sessionRate: parseInt(d.session_rate) || prev?.system?.sessionRate || 0,
                  packetRate: parseInt(d.packet_rate) || prev?.system?.packetRate || 0,
                  firmwareVersion: d.firmware_version || prev?.system?.firmwareVersion || 'v6.2.16',
                  uptimeSeconds: parseInt(d.uptime_seconds) || prev?.system?.uptimeSeconds || 0,
                  lastUpdate: new Date(),
                },
              };
              if (prev && prev.system && shallowEqual(prev.system, next.system)) return prev;
              return next;
            });
          });
        }

        if (msg.type === 'traffic_update' && msg.data) {
          const down = parseInt(msg.data.tx_bytes) || 0;
          const up = parseInt(msg.data.rx_bytes) || 0;
          scheduleUpdate('traffic', () => {
            setMetrics(prev => {
              const next = { ...prev, wanDown: down, wanUp: up };
              return shallowEqual(prev, next) ? prev : next;
            });
          });
        }

        if (msg.type === 'event' && Array.isArray(msg.data)) {
          scheduleUpdate('events', () => {
            setEvents(prev => {
              if (prev.length === msg.data.length && prev[0]?.id === msg.data[0]?.id) return prev;
              return msg.data;
            });
          });
        }

        if (msg.type === 'topology_update' && msg.data) {
          scheduleUpdate('topology', () => {
            setTopology(prev => {
              const next = { nodes: msg.data.nodes || [], edges: msg.data.edges || [] };
              if (prev.nodes.length === next.nodes.length && prev.edges.length === next.edges.length) return prev;
              return next;
            });
          });
        }

        if (msg.type === 'device_update' && Array.isArray(msg.data)) {
          scheduleUpdate('devices', () => {
            setDevices(prev => {
              if (prev.length === msg.data.length) return prev;
              return msg.data;
            });
          });
        }

        if (msg.type === 'fortigate_devices' && Array.isArray(msg.data)) {
          scheduleUpdate('fortigate_devices', () => {
            setFortigateDevices(msg.data);
          });
        }

        if (msg.type === 'vpn_tunnel' && msg.data) {
          scheduleUpdate('vpn_tunnel', () => {
            setVpnTunnel((prev: any) => {
              if (prev && prev.uptime === msg.data.uptime) return prev;
              return msg.data;
            });
          });
        }
      } catch (err) { console.error(err); }
    };
  }, []);

  // WebSocket 连接
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [connectWebSocket]);

  // REST API: fetch once on mount for initial data
  useEffect(() => {
    fetch(API_BASE + '/api/metrics').then(r => r.json()).then(d => {
      if (d.data) setMetrics(prev => ({ ...prev, ...d.data }));
    }).catch(() => {});

    fetch(API_BASE + '/api/fortigate/system').then(r => r.json()).then(d => {
      if (d.success && d.data) setFortiGate(d.data);
    }).catch(() => {});

    fetch(API_BASE + '/api/events?limit=20').then(r => r.json()).then(d => {
      if (d.data?.length) setEvents(d.data);
    }).catch(() => {});

    fetch(API_BASE + '/api/topology').then(r => r.json()).then(d => {
      if (d.data) setTopology({ nodes: d.data.nodes || [], edges: d.data.edges || [] });
    }).catch(() => {});

    fetch(API_BASE + '/api/devices').then(r => r.json()).then(d => {
      if (d.data?.length) setDevices(d.data);
    }).catch(() => {});

    fetch(API_BASE + '/api/fortigate/devices').then(r => r.json()).then(d => {
      if (d.success && d.data?.length) setFortigateDevices(d.data);
    }).catch(() => {});

    fetch(API_BASE + '/api/fortigate/vpn').then(r => r.json()).then(d => {
      if (d.success && d.data?.length) setVpnTunnel(d.data[0]);
    }).catch(() => {});
  }, []);


  return (
    <div className='min-h-screen bg-noc-bg flex flex-col'>
      <Header />
      <main className='flex-1 p-4 overflow-auto'>
        <div className='max-w-[1920px] mx-auto space-y-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3'>
            <MemoMetricCard title='WAN 下行' value={formatBits(metrics.wanDown)} subtitle='PPPoE · WAN' icon={Download} iconColor='text-noc-blue' />
            <MemoMetricCard title='WAN 上行' value={formatBits(metrics.wanUp)} subtitle='PPPoE · WAN' icon={Upload} iconColor='text-noc-green' />
            <MemoMetricCard title='在线设备' value={formatNumber(metrics.onlineDevices)} subtitle='LAN / Wi-Fi' icon={Users} iconColor='text-noc-green' />
            <MemoMetricCard title='VPN' value={metrics.vpnConnections + ' / 3'} subtitle='IPsec / SSL-VPN' icon={Shield} iconColor='text-noc-purple' />
            <MemoMetricCard title='会话数' value={formatNumber(metrics.activeSessions)} subtitle='活跃' icon={Activity} iconColor='text-noc-orange' />
            <MemoMetricCard title='CPU' value={Math.round(metrics.cpuUsage) + '%'} icon={Cpu} iconColor='text-noc-purple' />
            <MemoMetricCard title='内存' value={Math.round(metrics.memoryUsage) + '%'} icon={MemoryStick} iconColor='text-noc-orange' />
            <MemoMetricCard title='延迟' value={metrics.wanLatency + ' ms'} icon={Clock} iconColor='text-noc-blue' />
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <div className='lg:col-span-1 space-y-4'>
              {/* VPN 隧道状态 */}
              {vpnTunnel && (
                <div className='bg-noc-card border border-noc-border p-3 rounded-sm'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='w-2 h-2 rounded-full bg-noc-green animate-pulse' />
                    <span className='text-xs font-medium text-noc-text'>IPSec VPN 隧道</span>
                  </div>
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div>
                      <span className='text-noc-text-muted'>状态: </span>
                      <span className='text-noc-green'>已连接</span>
                    </div>
                    <div>
                      <span className='text-noc-text-muted'>运行: </span>
                      <span className='text-noc-text'>{formatDuration(vpnTunnel.uptime)}</span>
                    </div>
                    <div>
                      <span className='text-noc-text-muted'>↓ </span>
                      <span className='text-noc-text'>{formatBits(vpnTunnel.bytesIn * 8)}</span>
                    </div>
                    <div>
                      <span className='text-noc-text-muted'>↑ </span>
                      <span className='text-noc-text'>{formatBits(vpnTunnel.bytesOut * 8)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* FortiGate 设备 */}
              <div>
                {fortigateDevices.length > 0 && fortigateDevices[activeDeviceIndex] ? (
                  <MemoFortiGateCard status={fortigateDevices[activeDeviceIndex]} />
                ) : fortiGate ? (
                  <MemoFortiGateCard status={fortiGate} />
                ) : (
                  <div className='bg-noc-card border border-noc-border p-4 rounded-sm'>
                    <div className='text-noc-text-muted text-sm'>加载中...</div>
                  </div>
                )}
                
                {/* 设备切换按钮 */}
                {fortigateDevices.length > 1 && (
                  <div className='flex justify-center gap-2 mt-3'>
                    {fortigateDevices.map((device: any, index: number) => (
                      <button
                        key={device.id || index}
                        onClick={() => setActiveDeviceIndex(index)}
                        className={`px-3 py-1 text-xs rounded-sm transition-colors \${index === activeDeviceIndex ? 'bg-noc-purple text-white' : 'bg-noc-bg text-noc-text hover:bg-noc-border'}`}
                      >
                        {device.location || device.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className='lg:col-span-2'>
              <MemoNetworkTopology nodes={topology.nodes} edges={topology.edges} />
            </div>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <div className='lg:col-span-2'><MemoTrafficChart /></div>
            <div className='lg:col-span-1'><MemoDeviceList devices={devices} /></div>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <div className='lg:col-span-1'><MemoSystemChart /></div>
            <div className='lg:col-span-2'><MemoEventLog events={events} /></div>
          </div>
          <div className='grid grid-cols-1 gap-4'>
            <MemoAlertPanel />
          </div>
        </div>
      </main>
      <footer className='bg-noc-card border-t border-noc-border px-6 py-2'>
        <div className='flex items-center justify-between text-xs text-noc-text-muted'>
          <span>FortiGate 网络监控面板</span>
          <span className={isConnected ? 'text-noc-green' : 'text-noc-red'}>
            {isConnected ? '● 已连接' : '● 已断开'}
          </span>
        </div>
      </footer>
    </div>
  );
}