import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Radio,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface SnmpDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  interface_name: string;
  is_online: boolean;
  last_seen: string;
}

interface SnmpStats {
  lastCollection: { created_at: string; message: string } | null;
  lastError: { created_at: string; message: string } | null;
  collectionsLastHour: number;
  errorsLastHour: number;
  totalDevices: number;
  health: 'healthy' | 'degraded' | 'critical';
}

export function SnmpMonitor() {
  const [devices, setDevices] = useState<SnmpDevice[]>([]);
  const [stats, setStats] = useState<SnmpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesRes, statsRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3001/api/snmp/devices`),
        fetch(`http://${window.location.hostname}:3001/api/snmp/stats`),
      ]);

      const devicesData = await devicesRes.json();
      const statsData = await statsRes.json();

      if (devicesData.success) {
        setDevices(devicesData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-noc-green';
      case 'degraded':
        return 'text-noc-yellow';
      case 'critical':
        return 'text-noc-red';
      default:
        return 'text-noc-text-muted';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '无';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    return `${Math.floor(diffHours / 24)} 天前`;
  };

  if (loading && !stats) {
    return (
      <div className="p-4 bg-noc-card rounded-lg border border-noc-border">
        <div className="flex items-center gap-2 text-noc-text-muted">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>加载 SNMP 监控数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Health Status */}
      <div className="p-4 bg-noc-card rounded-lg border border-noc-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-noc-purple" />
            <h3 className="text-lg font-semibold text-noc-text">SNMP 监控状态</h3>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-noc-text-muted hover:text-noc-text transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-noc-red/10 border border-noc-red/20 rounded text-sm text-noc-red">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-noc-bg rounded">
              <div className="text-xs text-noc-text-muted mb-1">健康状态</div>
              <div className={cn('flex items-center gap-2 font-medium', getHealthColor(stats.health))}>
                {getHealthIcon(stats.health)}
                <span>{stats.health === 'healthy' ? '健康' : stats.health === 'degraded' ? '降级' : '异常'}</span>
              </div>
            </div>
            <div className="p-3 bg-noc-bg rounded">
              <div className="text-xs text-noc-text-muted mb-1">最近1小时采集次数</div>
              <div className="text-lg font-semibold text-noc-text">{stats.collectionsLastHour}</div>
            </div>
            <div className="p-3 bg-noc-bg rounded">
              <div className="text-xs text-noc-text-muted mb-1">最近1小时错误次数</div>
              <div className={cn('text-lg font-semibold', stats.errorsLastHour > 0 ? 'text-noc-red' : 'text-noc-green')}>
                {stats.errorsLastHour}
              </div>
            </div>
            <div className="p-3 bg-noc-bg rounded">
              <div className="text-xs text-noc-text-muted mb-1">发现设备数</div>
              <div className="text-lg font-semibold text-noc-text">{stats.totalDevices}</div>
            </div>
          </div>
        )}

        {stats?.lastCollection && (
          <div className="mt-3 p-2 bg-noc-bg rounded text-xs">
            <span className="text-noc-text-muted">最近采集: </span>
            <span className="text-noc-text">{formatTime(stats.lastCollection.created_at)}</span>
            <span className="text-noc-text-muted ml-2">-</span>
            <span className="text-noc-text ml-2">{stats.lastCollection.message}</span>
          </div>
        )}

        {stats?.lastError && (
          <div className="mt-2 p-2 bg-noc-red/5 border border-noc-red/10 rounded text-xs">
            <span className="text-noc-red">最近错误: </span>
            <span className="text-noc-text">{formatTime(stats.lastError.created_at)}</span>
            <span className="text-noc-text-muted ml-2">-</span>
            <span className="text-noc-text ml-2">{stats.lastError.message}</span>
          </div>
        )}
      </div>

      {/* Discovered Devices */}
      <div className="p-4 bg-noc-card rounded-lg border border-noc-border">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-5 h-5 text-noc-blue" />
          <h3 className="text-lg font-semibold text-noc-text">SNMP 发现的设备</h3>
        </div>

        {devices.length === 0 ? (
          <div className="text-center py-8 text-noc-text-muted">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无 SNMP 发现的设备</p>
            <p className="text-xs mt-1">配置 SNMP 并确保设备可访问</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-noc-border">
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">设备名称</th>
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">IP 地址</th>
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">接口</th>
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">MAC 地址</th>
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">状态</th>
                  <th className="text-left py-2 px-3 text-noc-text-muted font-medium">最后更新</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-noc-border/50 hover:bg-noc-bg/50">
                    <td className="py-2 px-3 text-noc-text">
                      <div className="flex items-center gap-2">
                        {device.is_online ? (
                          <Wifi className="w-4 h-4 text-noc-green" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-noc-red" />
                        )}
                        {device.name}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-noc-text font-mono text-xs">{device.ip_address || '-'}</td>
                    <td className="py-2 px-3 text-noc-text">{device.interface_name || '-'}</td>
                    <td className="py-2 px-3 text-noc-text font-mono text-xs">{device.mac_address || '-'}</td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs',
                          device.is_online
                            ? 'bg-noc-green/20 text-noc-green'
                            : 'bg-noc-red/20 text-noc-red'
                        )}
                      >
                        {device.is_online ? '在线' : '离线'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-noc-text-muted text-xs">
                      {formatTime(device.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SnmpMonitor;
