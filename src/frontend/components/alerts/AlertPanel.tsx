import { useState, useEffect, useCallback } from 'react';
import { cn, timeAgo } from '@/lib/utils';
import type { Alert, AlertSeverity, AlertStatus } from '@/types';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const API_BASE = 'http://' + window.location.hostname + ':3001';

// ============================================================
// Types
// ============================================================
interface AlertWithHistory extends Alert {
  history?: AlertHistoryEntry[];
}

interface AlertHistoryEntry {
  id: number;
  alert_id: number;
  action: string;
  actor: string;
  details: string | null;
  created_at: string;
}

// ============================================================
// Helper: severity → icon + colors
// ============================================================
function getSeverityInfo(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertOctagon,
        color: 'text-noc-red',
        bg: 'bg-noc-red/15',
        border: 'border-noc-red/30',
        label: '严重',
      };
    case 'high':
      return {
        icon: AlertTriangle,
        color: 'text-noc-orange',
        bg: 'bg-noc-orange/15',
        border: 'border-noc-orange/30',
        label: '高',
      };
    case 'medium':
      return {
        icon: AlertCircle,
        color: 'text-noc-yellow',
        bg: 'bg-noc-yellow/15',
        border: 'border-noc-yellow/30',
        label: '中',
      };
    case 'low':
      return {
        icon: Info,
        color: 'text-noc-blue',
        bg: 'bg-noc-blue/15',
        border: 'border-noc-blue/30',
        label: '低',
      };
    default:
      return {
        icon: Info,
        color: 'text-noc-text-muted',
        bg: 'bg-noc-bg',
        border: 'border-noc-border',
        label: severity,
      };
  }
}

function getStatusInfo(status: AlertStatus) {
  switch (status) {
    case 'active':
      return { color: 'text-noc-red', bg: 'bg-noc-red/20', label: '活跃' };
    case 'acknowledged':
      return { color: 'text-noc-yellow', bg: 'bg-noc-yellow/20', label: '已确认' };
    case 'resolved':
      return { color: 'text-noc-green', bg: 'bg-noc-green/20', label: '已解决' };
    default:
      return { color: 'text-noc-text-muted', bg: 'bg-noc-bg', label: status };
  }
}

// ============================================================
// AlertItem component
// ============================================================
function AlertItem({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onAcknowledge: (id: number) => void;
  onResolve: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<'ack' | 'resolve' | null>(null);

  const sevInfo = getSeverityInfo(alert.severity);
  const statusInfo = getStatusInfo(alert.status);
  const SevIcon = sevInfo.icon;

  const toDate = (d: string | Date): Date => (d instanceof Date ? d : new Date(d));

  // Fetch history when expanded
  useEffect(() => {
    if (expanded && history.length === 0) {
      setLoadingHistory(true);
      fetch(`${API_BASE}/api/alerts/${alert.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.history) {
            setHistory(d.data.history);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [expanded, alert.id, history.length]);

  const handleAck = async () => {
    setActionLoading('ack');
    try {
      await onAcknowledge(alert.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    setActionLoading('resolve');
    try {
      await onResolve(alert.id);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className={cn(
        'border rounded-sm transition-colors',
        sevInfo.border,
        'hover:bg-noc-card-hover/50'
      )}
    >
      {/* Main row */}
      <div className='flex items-start gap-3 px-4 py-3'>
        {/* Severity icon */}
        <div className={cn('p-1.5 rounded-sm mt-0.5', sevInfo.bg)}>
          <SevIcon className={cn('w-4 h-4', sevInfo.color)} />
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-sm font-medium text-noc-text truncate'>{alert.title}</span>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusInfo.bg, statusInfo.color)}>
              {statusInfo.label}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', sevInfo.bg, sevInfo.color)}>
              {sevInfo.label}
            </span>
          </div>
          <p className='text-xs text-noc-text-muted leading-relaxed line-clamp-2'>{alert.message}</p>
          <div className='flex items-center gap-3 mt-2 text-[11px] text-noc-text-muted'>
            <span className='flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {timeAgo(toDate(alert.createdAt))}
            </span>
            {alert.source && (
              <span className='px-1.5 py-0.5 bg-noc-bg rounded text-[10px]'>
                {alert.source}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1.5 shrink-0'>
          {alert.status === 'active' && (
            <>
              <button
                onClick={handleAck}
                disabled={actionLoading !== null}
                className='px-2 py-1 text-xs bg-noc-yellow/20 text-noc-yellow hover:bg-noc-yellow/30 rounded-sm transition-colors disabled:opacity-50'
                title='确认告警'
              >
                {actionLoading === 'ack' ? <Loader2 className='w-3 h-3 animate-spin' /> : <Eye className='w-3 h-3' />}
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading !== null}
                className='px-2 py-1 text-xs bg-noc-green/20 text-noc-green hover:bg-noc-green/30 rounded-sm transition-colors disabled:opacity-50'
                title='解决告警'
              >
                {actionLoading === 'resolve' ? <Loader2 className='w-3 h-3 animate-spin' /> : <CheckCircle2 className='w-3 h-3' />}
              </button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <button
              onClick={handleResolve}
              disabled={actionLoading !== null}
              className='px-2 py-1 text-xs bg-noc-green/20 text-noc-green hover:bg-noc-green/30 rounded-sm transition-colors disabled:opacity-50'
              title='解决告警'
            >
              {actionLoading === 'resolve' ? <Loader2 className='w-3 h-3 animate-spin' /> : <CheckCircle2 className='w-3 h-3' />}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className='p-1.5 hover:bg-noc-bg rounded-sm transition-colors text-noc-text-muted'
            title='展开详情'
          >
            {expanded ? <ChevronUp className='w-3.5 h-3.5' /> : <ChevronDown className='w-3.5 h-3.5' />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className='px-4 pb-3 border-t border-noc-border/50'>
          {/* Alert details */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div className='mt-3 p-2 bg-noc-bg rounded-sm'>
              <p className='text-[10px] text-noc-text-muted mb-1 font-medium uppercase'>详细信息</p>
              <pre className='text-xs text-noc-text overflow-x-auto'>
                {JSON.stringify(alert.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Timeline */}
          <div className='mt-3'>
            <p className='text-[10px] text-noc-text-muted mb-2 font-medium uppercase'>时间线</p>
            {loadingHistory ? (
              <div className='flex items-center gap-2 text-xs text-noc-text-muted py-2'>
                <Loader2 className='w-3 h-3 animate-spin' />
                <span>加载中...</span>
              </div>
            ) : history.length > 0 ? (
              <div className='space-y-2'>
                {history.map((entry) => (
                  <div key={entry.id} className='flex items-start gap-2 text-xs'>
                    <div className='w-1.5 h-1.5 rounded-full bg-noc-text-muted mt-1.5 shrink-0' />
                    <div>
                      <span className='text-noc-text'>{entry.details || entry.action}</span>
                      <span className='text-noc-text-muted ml-2'>
                        {timeAgo(toDate(entry.created_at))} · {entry.actor}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-xs text-noc-text-muted py-1'>暂无历史记录</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AlertPanel component
// ============================================================
interface AlertPanelProps {
  className?: string;
  compact?: boolean;
}

type FilterStatus = 'all' | AlertStatus;
type FilterSeverity = 'all' | AlertSeverity;

export function AlertPanel({ className, compact = false }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [showResolved, setShowResolved] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterSeverity !== 'all') params.set('severity', filterSeverity);
      params.set('limit', compact ? '5' : '50');

      const res = await fetch(`${API_BASE}/api/alerts?${params}`);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, compact]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${id}/acknowledge`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status: 'acknowledged' } : a)));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${id}/resolve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status: 'resolved' } : a)));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Filter out resolved alerts unless showResolved is true
  const displayAlerts = showResolved
    ? alerts
    : alerts.filter(a => a.status !== 'resolved');

  // Stats
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const ackCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm', className)}>
      {/* Header */}
      <div className='px-4 py-3 border-b border-noc-border'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-noc-yellow' />
            <h3 className='text-sm font-semibold text-noc-text'>告警中心</h3>
          </div>
          <button
            onClick={fetchAlerts}
            className='p-1 hover:bg-noc-bg rounded-sm transition-colors text-noc-text-muted'
            title='刷新'
          >
            <RefreshCw className='w-3.5 h-3.5' />
          </button>
        </div>

        {/* Stats badges */}
        {!compact && (
          <div className='flex items-center gap-2 mb-3'>
            <span className='flex items-center gap-1 px-2 py-0.5 bg-noc-red/20 text-noc-red rounded text-[10px] font-medium'>
              <XCircle className='w-3 h-3' />
              {activeCount} 活跃
            </span>
            <span className='flex items-center gap-1 px-2 py-0.5 bg-noc-yellow/20 text-noc-yellow rounded text-[10px] font-medium'>
              <Eye className='w-3 h-3' />
              {ackCount} 已确认
            </span>
            <span className='flex items-center gap-1 px-2 py-0.5 bg-noc-green/20 text-noc-green rounded text-[10px] font-medium'>
              <CheckCircle2 className='w-3 h-3' />
              {resolvedCount} 已解决
            </span>
          </div>
        )}

        {/* Filters */}
        {!compact && (
          <div className='flex items-center gap-2'>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className='px-2 py-1 bg-noc-bg border border-noc-border rounded-sm text-xs text-noc-text'
            >
              <option value='all'>所有状态</option>
              <option value='active'>活跃</option>
              <option value='acknowledged'>已确认</option>
              <option value='resolved'>已解决</option>
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
              className='px-2 py-1 bg-noc-bg border border-noc-border rounded-sm text-xs text-noc-text'
            >
              <option value='all'>所有级别</option>
              <option value='critical'>严重</option>
              <option value='high'>高</option>
              <option value='medium'>中</option>
              <option value='low'>低</option>
            </select>
            <label className='flex items-center gap-1 text-xs text-noc-text-muted cursor-pointer'>
              <input
                type='checkbox'
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className='rounded border-noc-border'
              />
              显示已解决
            </label>
          </div>
        )}
      </div>

      {/* Alert list */}
      <div className={cn('overflow-y-auto', compact ? 'max-h-[300px]' : 'max-h-[600px]')}>
        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='w-5 h-5 text-noc-text-muted animate-spin' />
          </div>
        ) : displayAlerts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8 text-noc-text-muted'>
            <CheckCircle2 className='w-8 h-8 mb-2 opacity-50' />
            <p className='text-xs'>暂无告警</p>
          </div>
        ) : (
          <div className='divide-y divide-noc-border/50'>
            {displayAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with link */}
      {!compact && alerts.length > 0 && (
        <div className='px-4 py-2 border-t border-noc-border text-center'>
          <span className='text-[11px] text-noc-text-muted'>
            共 {alerts.length} 条告警记录
          </span>
        </div>
      )}
    </div>
  );
}
