/**
 * Toast 通知组件
 * 显示临时的通知消息
 */

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast, type ToastMessage } from '@/lib/errorHandler';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: {
    bg: 'bg-noc-green/10 border-noc-green/20',
    icon: 'text-noc-green',
    title: 'text-noc-green',
  },
  error: {
    bg: 'bg-noc-red/10 border-noc-red/20',
    icon: 'text-noc-red',
    title: 'text-noc-red',
  },
  warning: {
    bg: 'bg-noc-yellow/10 border-noc-yellow/20',
    icon: 'text-noc-yellow',
    title: 'text-noc-yellow',
  },
  info: {
    bg: 'bg-noc-blue/10 border-noc-blue/20',
    icon: 'text-noc-blue',
    title: 'text-noc-blue',
  },
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast: toastData, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const Icon = iconMap[toastData.type];
  const colors = colorMap[toastData.type];

  useEffect(() => {
    // 进入动画
    requestAnimationFrame(() => setIsVisible(true));

    // 自动关闭
    if (toastData.duration && toastData.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toastData.duration);

      return () => clearTimeout(timer);
    }
  }, [toastData.duration]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toastData.id);
    }, 300); // 退出动画时间
  }, [toastData.id, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 max-w-sm',
        colors.bg,
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
    >
      {/* 图标 */}
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)} />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', colors.title)}>
          {toastData.title}
        </p>
        {toastData.message && (
          <p className="text-xs text-noc-text-muted mt-1 line-clamp-2">
            {toastData.message}
          </p>
        )}
      </div>

      {/* 关闭按钮 */}
      {toastData.dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-noc-text-muted hover:text-noc-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Toast 容器组件
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // 订阅 toast 事件
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
