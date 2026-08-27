import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { NetworkEvent } from '@/types';
import { Info, AlertTriangle, XCircle, AlertOctagon, Shield, Wifi, Server, Network } from 'lucide-react';

export function EventLog({ events, className }: { events: NetworkEvent[]; className?: string }) {
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return Info;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      case 'critical': return AlertOctagon;
      default: return Info;
    }
  };
  const getLevelColors = (level: string) => {
    switch (level) {
      case 'info': return 'text-noc-blue bg-noc-blue/20';
      case 'warning': return 'text-noc-yellow bg-noc-yellow/20';
      case 'error': return 'text-noc-red bg-noc-red/20';
      case 'critical': return 'text-noc-red bg-noc-red/30';
      default: return 'text-noc-text-muted bg-noc-bg';
    }
  };
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'firewall': case 'vpn': case 'ips': return Shield;
      case 'system': return Server;
      case 'dhcp': return Network;
      case 'wifi': return Wifi;
      default: return Info;
    }
  };
  const toDate = (ts: Date | string): Date => ts instanceof Date ? ts : new Date(ts);
  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm', className)}>
      <div className='px-4 py-3 border-b border-noc-border'>
        <h3 className='text-sm font-semibold text-noc-text'>实时事件</h3>
      </div>
      <div className='max-h-[400px] overflow-y-auto'>
        {events.map((event) => {
          const LevelIcon = getLevelIcon(event.level);
          const SourceIcon = getSourceIcon(event.source);
          return (
            <div key={event.id} className='flex items-start gap-3 px-4 py-3 border-b border-noc-border/50 hover:bg-noc-bg/50 transition-colors'>
              <div className={cn('p-1.5 rounded-sm', getLevelColors(event.level))}><LevelIcon className='w-3.5 h-3.5' /></div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1'>
                  <SourceIcon className='w-3 h-3 text-noc-text-muted' />
                  <span className='text-xs font-medium text-noc-text-muted uppercase'>{event.source}</span>
                </div>
                <p className='text-xs text-noc-text leading-relaxed'>{event.message}</p>
              </div>
              <span className='text-xs text-noc-text-muted whitespace-nowrap'>{timeAgo(toDate(event.timestamp))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}