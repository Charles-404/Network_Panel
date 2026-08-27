import { memo } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export const MetricCard = memo(function MetricCard({
  title, value, subtitle, icon: Icon, iconColor = 'text-noc-blue',
  trend, trendValue, className,
}: MetricCardProps) {
  return (
    <div className={cn('bg-noc-card border border-noc-border p-4 rounded-sm hover:bg-noc-card-hover transition-colors duration-200', className)}>
      <div className='flex items-start justify-between'>
        <div className='flex-1 min-w-0'>
          <p className='text-xs text-noc-text-muted uppercase tracking-wider font-medium mb-1'>{title}</p>
          <div className='flex items-baseline gap-2'>
            <p className='text-2xl font-semibold text-noc-text font-mono'>{value}</p>
            {trend && (
              <span className={cn('text-xs font-medium', trend === 'up' && 'text-noc-green', trend === 'down' && 'text-noc-red', trend === 'neutral' && 'text-noc-text-muted')}>
                {trend === 'up' && '↑'}{trend === 'down' && '↓'}{trendValue}
              </span>
            )}
          </div>
          {subtitle && <p className='text-xs text-noc-text-muted mt-1'>{subtitle}</p>}
        </div>
        {Icon && <div className={cn('p-2 rounded-sm bg-noc-bg/50', iconColor)}><Icon className='w-5 h-5' /></div>}
      </div>
    </div>
  );
});