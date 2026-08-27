import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API_BASE = 'http://' + window.location.hostname + ':3001';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className='bg-noc-card border border-noc-border p-3 rounded-sm shadow-lg'>
      <p className='text-xs text-noc-text-muted mb-2'>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className='flex items-center gap-2 text-xs'>
          <span className={cn('w-2 h-2 rounded-full', entry.name === 'cpu' ? 'bg-noc-purple' : 'bg-noc-orange')} />
          <span className='text-noc-text-muted'>{entry.name === 'cpu' ? 'CPU' : '内存'}:</span>
          <span className='text-noc-text font-medium font-mono'>{entry.value}%</span>
        </div>
      ))}
    </div>
  );
};

export function SystemChart({ className }: { className?: string }) {
  const [rawCpu, setRawCpu] = useState<any[]>([]);
  const [rawMem, setRawMem] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(API_BASE + '/api/history/cpu?limit=60').then(r => r.json()),
      fetch(API_BASE + '/api/history/memory?limit=60').then(r => r.json()),
    ]).then(([cpuRes, memRes]) => {
      setRawCpu(cpuRes.data || []);
      setRawMem(memRes.data || []);
    }).catch(() => { setRawCpu([]); setRawMem([]); });
  }, []);

  const data = useMemo(() => {
    const cpuData = [...rawCpu].reverse();
    const memData = [...rawMem].reverse();
    const maxLen = Math.max(cpuData.length, memData.length);
    const result = [];
    for (let i = 0; i < maxLen; i++) {
      const cpuItem = cpuData[i]; const memItem = memData[i];
      const item = cpuItem || memItem; if (!item) continue;
      const ts = new Date(item.timestamp).getTime();
      result.push({
        time: new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        cpu: cpuItem ? parseFloat(cpuItem.value) || 0 : 0,
        memory: memItem ? parseFloat(memItem.value) || 0 : 0,
      });
    }
    return result;
  }, [rawCpu, rawMem]);

  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm', className)}>
      <div className='px-4 py-3 border-b border-noc-border'>
        <h3 className='text-sm font-semibold text-noc-text'>系统使用率</h3>
      </div>
      <div className='p-4 h-[200px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='cpuGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#a855f7' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#a855f7' stopOpacity={0} />
              </linearGradient>
              <linearGradient id='memoryGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#f97316' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#f97316' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)' vertical={false} />
            <XAxis dataKey='time' stroke='#71717a' fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} interval='preserveStartEnd' />
            <YAxis stroke='#71717a' fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} domain={[0, 100]} tickFormatter={(v) => v + '%'} />
            <Tooltip content={<CustomTooltip />} />
            <Area type='monotone' dataKey='cpu' stroke='#a855f7' strokeWidth={2} fill='url(#cpuGradient)' isAnimationActive={false} />
            <Area type='monotone' dataKey='memory' stroke='#f97316' strokeWidth={2} fill='url(#memoryGradient)' isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className='flex items-center justify-center gap-6 px-4 pb-3'>
        <div className='flex items-center gap-2 text-xs'><span className='w-3 h-0.5 bg-noc-purple rounded-full' /><span className='text-noc-text-muted'>CPU</span></div>
        <div className='flex items-center gap-2 text-xs'><span className='w-3 h-0.5 bg-noc-orange rounded-full' /><span className='text-noc-text-muted'>内存</span></div>
      </div>
    </div>
  );
}