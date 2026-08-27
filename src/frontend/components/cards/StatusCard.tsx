import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  status?: 'normal' | 'warning' | 'error';
  className?: string;
}

export function StatusCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status = 'normal',
  className,
}: StatusCardProps) {
  const statusColors = {
    normal: 'border-noc-green/30',
    warning: 'border-noc-yellow/30',
    error: 'border-noc-red/30',
  };

  const iconColors = {
    normal: 'text-noc-green',
    warning: 'text-noc-yellow',
    error: 'text-noc-red',
  };

  return (
    <div
      className={cn(
        'bg-noc-card border rounded-sm p-4',
        statusColors[status],
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <Icon className={cn('w-4 h-4', iconColors[status])} />
        )}
        <span className="text-xs text-noc-text-muted uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-noc-text font-mono">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-noc-text-muted">{subtitle}</span>
        )}
      </div>
    </div>
  );
}