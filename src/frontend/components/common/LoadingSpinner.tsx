/**
 * 加载组件
 * 统一的加载动画和骨架屏组件
 */

import { cn } from '@/lib/utils';

// ============================================================
// 加载动画组件
// ============================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export function LoadingSpinner({
  size = 'md',
  text,
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-noc-border border-t-noc-blue',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-noc-text-muted animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-noc-bg flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// ============================================================
// 骨架屏组件
// ============================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const defaultDimensions = {
    text: 'h-4 w-full',
    circular: 'h-12 w-12',
    rectangular: 'h-24 w-full',
  };

  return (
    <div
      className={cn(
        'bg-noc-border/30',
        variantClasses[variant],
        defaultDimensions[variant],
        animate && 'animate-pulse',
        className
      )}
      style={{
        ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
        ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
      }}
    />
  );
}

// ============================================================
// 预设骨架屏组件
// ============================================================

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-lg p-4 space-y-3', className)}>
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="text" width="80%" height={32} />
      <Skeleton variant="text" width="60%" height={16} />
    </div>
  );
}

/**
 * 表格行骨架屏
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-noc-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * 图表骨架屏
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-lg p-4', className)}>
      <div className="mb-4">
        <Skeleton variant="text" width="30%" height={20} />
      </div>
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width="100%"
            height={`${30 + Math.random() * 70}%`}
            className="flex-1"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 仪表盘骨架屏
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-noc-bg flex flex-col">
      {/* Header 骨架 */}
      <div className="bg-noc-card border-b border-noc-border px-6 py-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={100} height={20} />
        </div>
      </div>

      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-[1920px] mx-auto space-y-4">
          {/* 指标卡片行 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <CardSkeleton className="h-48" />
            </div>
            <div className="lg:col-span-2">
              <ChartSkeleton className="h-48" />
            </div>
          </div>

          {/* 更多图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartSkeleton className="h-64" />
            </div>
            <div className="lg:col-span-1">
              <CardSkeleton className="h-64" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
