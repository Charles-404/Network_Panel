import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatBits } from '@/lib/utils';

const API_BASE = 'http://' + window.location.hostname + ':3001';
const timeRanges = [
  { label: '5分钟', value: 60 },
  { label: '15分钟', value: 180 },
  { label: '1小时', value: 720 },
  { label: '6小时', value: 4320 },
  { label: '24小时', value: 17280 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className='bg-noc-card border border-noc-border p-3 rounded-sm shadow-lg'>
      <p className='text-xs text-noc-text-muted mb-2'>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className='flex items-center gap-2 text-xs'>
          <span className={cn('w-2 h-2 rounded-full', entry.name === 'rx' ? 'bg-noc-blue' : 'bg-noc-green')} />
          <span className='text-noc-text-muted'>{entry.name === 'rx' ? '下行' : '上行'}:</span>
          <span className='text-noc-text font-medium font-mono'>{formatBits(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function TrafficChart({ className }: { className?: string }) {
  const [selectedRange, setSelectedRange] = useState(720);
  const [rawIn, setRawIn] = useState<any[]>([]);
  const [rawOut, setRawOut] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(API_BASE + '/api/history/traffic_in?limit=' + selectedRange).then(r => r.json()),
      fetch(API_BASE + '/api/history/traffic_out?limit=' + selectedRange).then(r => r.json()),
    ]).then(([inRes, outRes]) => {
      setRawIn(inRes.data || []);
      setRawOut(outRes.data || []);
    }).catch(() => { setRawIn([]); setRawOut([]); });
  }, [selectedRange, refreshKey]);

  const data = useMemo(() => {
    const inMap = new Map<number, number>();
    const outMap = new Map<number, number>();
    rawIn.forEach((d: any) => inMap.set(new Date(d.timestamp).getTime(), parseFloat(d.value) || 0));
    rawOut.forEach((d: any) => outMap.set(new Date(d.timestamp).getTime(), parseFloat(d.value) || 0));
    const allTs = Array.from(new Set([...inMap.keys(), ...outMap.keys()])).sort((a, b) => a - b);
    return allTs.map(ts => ({
      time: new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      rx: (inMap.get(ts) || 0) * 1000000 / 8,
      tx: (outMap.get(ts) || 0) * 1000000 / 8,
    }));
  }, [rawIn, rawOut]);

  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm', className)}>
      <div className='flex items-center justify-between px-4 py-3 border-b border-noc-border'>
        <h3 className='text-sm font-semibold text-noc-text'>WAN 流量</h3>
        <div className='flex gap-1'>
          {timeRanges.map((range) => (
            <button key={range.value} onClick={() => setSelectedRange(range.value)}
              className={cn('px-2 py-1 text-xs rounded-sm transition-colors',
                selectedRange === range.value ? 'bg-noc-blue/20 text-noc-blue' : 'text-noc-text-muted hover:text-noc-text hover:bg-noc-bg/50')}>
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className='p-4 h-[280px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='rxGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#3b82f6' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#3b82f6' stopOpacity={0} />
              </linearGradient>
              <linearGradient id='txGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#22c55e' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#22c55e' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)' vertical={false} />
            <XAxis dataKey='time' stroke='#71717a' fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} interval='preserveStartEnd' />
            <YAxis stroke='#71717a' fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} tickFormatter={(v) => formatBits(v)} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Area type='monotone' dataKey='rx' stroke='#3b82f6' strokeWidth={2} fill='url(#rxGradient)' dot={false} activeDot={{ r: 3, fill: '#3b82f6' }} isAnimationActive={false} />
            <Area type='monotone' dataKey='tx' stroke='#22c55e' strokeWidth={2} fill='url(#txGradient)' dot={false} activeDot={{ r: 3, fill: '#22c55e' }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className='flex items-center justify-center gap-6 px-4 pb-3'>
        <div className='flex items-center gap-2 text-xs'><span className='w-3 h-0.5 bg-noc-blue rounded-full' /><span className='text-noc-text-muted'>下行</span></div>
        <div className='flex items-center gap-2 text-xs'><span className='w-3 h-0.5 bg-noc-green rounded-full' /><span className='text-noc-text-muted'>上行</span></div>
      </div>
    </div>
  );
}