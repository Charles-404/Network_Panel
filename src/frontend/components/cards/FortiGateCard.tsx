import { cn } from '@/lib/utils';
import { formatDuration, getStatusColor, getStatusBgColor } from '@/lib/utils';
import type { FortiGateStatus } from '@/types';
import { Shield, Cpu, MemoryStick, Thermometer, Activity, Clock, HardDrive, MapPin } from 'lucide-react';

interface FortiGateCardProps {
  status: FortiGateStatus & { id?: string; ip?: string; location?: string; traffic?: { rxBytes: number; txBytes: number } };
  className?: string;
}

export function FortiGateCard({ status, className }: FortiGateCardProps) {
  if (!status || !status.system) {
    return (
      <div className={cn('bg-noc-card border border-noc-border p-4 rounded-sm', className)}>
        <div className='text-noc-text-muted text-sm'>加载中...</div>
      </div>
    );
  }
  const { system } = status;
  const stats = [
    { icon: Cpu, label: 'CPU', value: Math.round(system.cpu) + '%', color: system.cpu > 80 ? 'text-noc-red' : system.cpu > 60 ? 'text-noc-yellow' : 'text-noc-green' },
    { icon: MemoryStick, label: '内存', value: Math.round(system.memory) + '%', color: system.memory > 80 ? 'text-noc-red' : system.memory > 60 ? 'text-noc-yellow' : 'text-noc-green' },
    { icon: Thermometer, label: '温度', value: Math.round(system.temperature) + '°C', color: system.temperature > 60 ? 'text-noc-red' : system.temperature > 50 ? 'text-noc-yellow' : 'text-noc-green' },
    { icon: Activity, label: '会话数', value: system.sessionCount.toLocaleString(), color: 'text-noc-blue' },
  ];
  return (
    <div className={cn('bg-noc-card border border-noc-border p-4 rounded-sm', className)}>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-noc-purple/20 rounded-sm'><Shield className='w-6 h-6 text-noc-purple' /></div>
          <div>
            <h3 className='text-sm font-semibold text-noc-text'>{status.name}</h3>
            <p className='text-xs text-noc-text-muted'>{status.model}</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium', getStatusBgColor(status.status), getStatusColor(status.status))}>
          <span className='w-2 h-2 rounded-full bg-current animate-pulse' />
          {status.status === 'online' ? '在线' : status.status === 'offline' ? '离线' : '警告'}
        </div>
      </div>
      
      {/* 位置和IP信息 */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        <div className='flex items-center gap-2 text-xs'>
          <HardDrive className='w-4 h-4 text-noc-text-muted' />
          <div><p className='text-noc-text-muted'>固件</p><p className='text-noc-text font-medium'>{status.firmwareVersion}</p></div>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Clock className='w-4 h-4 text-noc-text-muted' />
          <div><p className='text-noc-text-muted'>运行时间</p><p className='text-noc-text font-medium'>{formatDuration(status.uptimeSeconds)}</p></div>
        </div>
        {(status as any).location && (
          <div className='flex items-center gap-2 text-xs'>
            <MapPin className='w-4 h-4 text-noc-text-muted' />
            <div><p className='text-noc-text-muted'>位置</p><p className='text-noc-text font-medium'>{(status as any).location}</p></div>
          </div>
        )}
        {(status as any).ip && (
          <div className='flex items-center gap-2 text-xs'>
            <Activity className='w-4 h-4 text-noc-text-muted' />
            <div><p className='text-noc-text-muted'>IP</p><p className='text-noc-text font-medium font-mono'>{(status as any).ip}</p></div>
          </div>
        )}
      </div>
      
      <div className='grid grid-cols-2 gap-3'>
        {stats.map((stat) => (
          <div key={stat.label} className='bg-noc-bg/50 rounded-sm p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className='text-xs text-noc-text-muted'>{stat.label}</span>
            </div>
            <p className={cn('text-lg font-semibold font-mono', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>
      
      <div className='mt-3 grid grid-cols-2 gap-3 text-xs'>
        <div className='bg-noc-bg/50 rounded-sm p-2'>
          <p className='text-noc-text-muted'>包速率</p>
          <p className='text-noc-text font-medium'>{system.packetRate.toLocaleString()} pps</p>
        </div>
        <div className='bg-noc-bg/50 rounded-sm p-2'>
          <p className='text-noc-text-muted'>会话速率</p>
          <p className='text-noc-text font-medium'>{system.sessionRate.toLocaleString()} cps</p>
        </div>
      </div>
      
      {/* 流量统计 */}
      {(status as any).traffic && (
        <div className='mt-3 grid grid-cols-2 gap-3 text-xs'>
          <div className='bg-noc-bg/50 rounded-sm p-2'>
            <p className='text-noc-text-muted'>↓ 下行</p>
            <p className='text-noc-blue font-medium'>{((status as any).traffic.rxBytes * 8 / 1000000).toFixed(2)} Mbps</p>
          </div>
          <div className='bg-noc-bg/50 rounded-sm p-2'>
            <p className='text-noc-text-muted'>↑ 上行</p>
            <p className='text-noc-green font-medium'>{((status as any).traffic.txBytes * 8 / 1000000).toFixed(2)} Mbps</p>
          </div>
        </div>
      )}
    </div>
  );
}
