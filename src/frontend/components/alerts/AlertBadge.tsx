import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const WS_URL = 'ws://' + window.location.hostname + ':3002';
const API_BASE = 'http://' + window.location.hostname + ':3001';

interface AlertBadgeProps {
  className?: string;
  onClick?: () => void;
}

export function AlertBadge({ className, onClick }: AlertBadgeProps) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch initial count
  useEffect(() => {
    fetch(API_BASE + '/api/alerts/active-count')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setCount(d.data.count);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for real-time updates via WebSocket
  const handleWsMessage = useCallback((e: MessageEvent) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'alert_count' && msg.data) {
        setCount(msg.data.count);
      }
      if (msg.type === 'alert') {
        // New alert arrived – animate
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
        // Increment count
        setCount(prev => prev + 1);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = handleWsMessage;
    return () => ws.close();
  }, [handleWsMessage]);

  const getBadgeColor = () => {
    if (count === 0) return 'bg-noc-text-muted';
    if (count <= 2) return 'bg-noc-yellow';
    if (count <= 5) return 'bg-noc-orange';
    return 'bg-noc-red';
  };

  return (
    <button
      className={cn(
        'relative p-2 hover:bg-noc-bg rounded-sm transition-colors',
        className
      )}
      onClick={onClick}
      aria-label={`${count} active alerts`}
    >
      <Bell
        className={cn(
          'w-5 h-5 text-noc-text-muted transition-transform',
          isAnimating && 'animate-bounce'
        )}
      />
      {count > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 flex items-center justify-center',
            'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white',
            getBadgeColor(),
            isAnimating && 'animate-pulse'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
