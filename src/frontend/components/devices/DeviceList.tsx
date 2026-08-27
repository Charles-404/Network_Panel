import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils';
import type { ConnectedDevice } from '@/types';
import { Monitor, Smartphone, HardDrive, Printer, Wifi, Circle } from 'lucide-react';

export function DeviceList({ devices, className }: { devices: ConnectedDevice[]; className?: string }) {
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mac': case 'pc': return Monitor;
      case 'iphone': case 'android': return Smartphone;
      case 'nas': return HardDrive;
      case 'printer': return Printer;
      case 'iot': return Wifi;
      default: return Monitor;
    }
  };
  const sorted = [...devices].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return (b.traffic?.rxRate || 0) - (a.traffic?.rxRate || 0);
  });
  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm', className)}>
      <div className='px-4 py-3 border-b border-noc-border'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold text-noc-text'>已连接设备</h3>
          <span className='text-xs text-noc-text-muted'>{devices.filter(d => d.isOnline).length} / {devices.length} 在线</span>
        </div>
      </div>
      <div className='max-h-[350px] overflow-y-auto'>
        {sorted.map((device) => {
          const DeviceIcon = getDeviceIcon(device.type);
          return (
            <div key={device.id} className='flex items-center gap-3 px-4 py-3 border-b border-noc-border/50 hover:bg-noc-bg/50 transition-colors'>
              <div className={cn('p-2 rounded-sm', device.isOnline ? 'bg-noc-green/20 text-noc-green' : 'bg-noc-bg text-noc-text-muted')}><DeviceIcon className='w-4 h-4' /></div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-noc-text truncate'>{device.name}</span>
                  <span className={cn('flex items-center gap-1 text-[10px]', device.isOnline ? 'text-noc-green' : 'text-noc-red')}>
                    <Circle className='w-2 h-2 fill-current' />{device.isOnline ? '在线' : '离线'}
                  </span>
                </div>
                <div className='flex items-center gap-3 text-xs text-noc-text-muted'>
                  <span>{device.ipAddress}</span>
                  {device.interface && <span>{device.interface}</span>}
                </div>
              </div>
              {device.isOnline && device.traffic && (
                <div className='text-right'>
                  <div className='text-xs text-noc-text-muted'><span className='text-noc-blue'>↓</span> {formatBytes(device.traffic.rxRate)}/s</div>
                  <div className='text-xs text-noc-text-muted'><span className='text-noc-green'>↑</span> {formatBytes(device.traffic.txRate)}/s</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}