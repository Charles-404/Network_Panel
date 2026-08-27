import { cn } from '@/lib/utils';
import { Shield, Bell, Settings, Wifi } from 'lucide-react';

export function Header({ className }: { className?: string }) {
  return (
    <header className={cn('bg-noc-card border-b border-noc-border', className)}>
      <div className='flex items-center justify-between px-6 py-3'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Shield className='w-8 h-8 text-noc-purple' />
            <div>
              <h1 className='text-lg font-semibold text-noc-text'>FortiGate 网络监控面板</h1>
              <p className='text-xs text-noc-text-muted'>网络运营中心</p>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2 px-3 py-1.5 bg-noc-bg rounded-sm'>
            <Wifi className='w-4 h-4 text-noc-green' />
            <span className='text-xs text-noc-text-muted'>已连接</span>
          </div>
          <button className='relative p-2 hover:bg-noc-bg rounded-sm transition-colors'>
            <Bell className='w-5 h-5 text-noc-text-muted' />
            <span className='absolute top-1 right-1 w-2 h-2 bg-noc-yellow rounded-full' />
          </button>
          <button className='p-2 hover:bg-noc-bg rounded-sm transition-colors'>
            <Settings className='w-5 h-5 text-noc-text-muted' />
          </button>
        </div>
      </div>
    </header>
  );
}