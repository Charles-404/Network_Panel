import { cn } from '@/lib/utils';
import { Monitor, RefreshCw, BarChart3, Eye, Layers } from 'lucide-react';

interface DisplaySettingsProps {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const themes = [
  { value: 'dark', label: '深色模式', description: '适合夜间使用，减少眼睛疲劳' },
  { value: 'light', label: '浅色模式', description: '适合白天使用，清晰明亮' },
  { value: 'auto', label: '跟随系统', description: '根据系统设置自动切换' },
];

const refreshIntervals = [
  { value: 1000, label: '1秒', description: '实时性最高，资源消耗较大' },
  { value: 2000, label: '2秒', description: '平衡实时性和性能' },
  { value: 5000, label: '5秒', description: '默认推荐值' },
  { value: 10000, label: '10秒', description: '节省资源' },
  { value: 30000, label: '30秒', description: '低频更新' },
  { value: 60000, label: '1分钟', description: '最低频率' },
];

export function DisplaySettings({ settings, onChange }: DisplaySettingsProps) {
  const refreshInterval = (settings.refreshInterval as number) || 5000;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-noc-text mb-4">显示设置</h3>
        <p className="text-sm text-noc-text-muted mb-6">
          自定义界面外观和数据刷新频率
        </p>
      </div>

      {/* Theme */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-noc-purple" />
          <label className="text-sm font-medium text-noc-text">主题</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(theme => (
            <button
              key={theme.value}
              onClick={() => onChange('theme', theme.value)}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                (settings.theme as string) === theme.value
                  ? 'border-noc-purple bg-noc-purple/10'
                  : 'border-noc-border bg-noc-bg hover:border-noc-text-muted'
              )}
            >
              <div className={cn(
                'w-full h-16 rounded mb-3',
                theme.value === 'dark' ? 'bg-gray-900' :
                theme.value === 'light' ? 'bg-white' :
                'bg-gradient-to-r from-gray-900 to-white'
              )} />
              <div className="text-sm font-medium text-noc-text">{theme.label}</div>
              <div className="text-xs text-noc-text-muted mt-1">{theme.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Interval */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-noc-green" />
            <label className="text-sm font-medium text-noc-text">数据刷新间隔</label>
          </div>
          <span className="text-sm text-noc-text-muted font-mono">
            {refreshInterval / 1000}秒
          </span>
        </div>
        <input
          type="range"
          min="1000"
          max="60000"
          step="1000"
          value={refreshInterval}
          onChange={(e) => onChange('refreshInterval', parseInt(e.target.value))}
          className="w-full h-2 bg-noc-bg rounded-lg appearance-none cursor-pointer"
        />
        <div className="grid grid-cols-6 gap-2">
          {refreshIntervals.map(interval => (
            <button
              key={interval.value}
              onClick={() => onChange('refreshInterval', interval.value)}
              className={cn(
                'px-2 py-1.5 text-xs rounded transition-colors',
                refreshInterval === interval.value
                  ? 'bg-noc-purple/20 text-noc-purple'
                  : 'bg-noc-bg text-noc-text-muted hover:text-noc-text'
              )}
            >
              {interval.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-noc-text-muted">
          {refreshIntervals.find(i => i.value === refreshInterval)?.description || '自定义间隔'}
        </p>
      </div>

      {/* Chart Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-noc-blue" />
          <label className="text-sm font-medium text-noc-text">图表选项</label>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">启用动画</div>
              <div className="text-xs text-noc-text-muted">图表数据更新时显示过渡动画</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.chartAnimations as boolean) !== false}
                onChange={(e) => onChange('chartAnimations', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.chartAnimations as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.chartAnimations as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">显示网格线</div>
              <div className="text-xs text-noc-text-muted">图表背景显示参考网格</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.chartGridLines as boolean) !== false}
                onChange={(e) => onChange('chartGridLines', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.chartGridLines as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.chartGridLines as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-noc-orange" />
          <label className="text-sm font-medium text-noc-text">界面选项</label>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">紧凑模式</div>
              <div className="text-xs text-noc-text-muted">减小间距和字体大小，显示更多内容</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.compactMode as boolean) === true}
                onChange={(e) => onChange('compactMode', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.compactMode as boolean) === true ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.compactMode as boolean) === true ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">显示时间戳</div>
              <div className="text-xs text-noc-text-muted">在卡片和事件中显示详细时间</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.showTimestamps as boolean) !== false}
                onChange={(e) => onChange('showTimestamps', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.showTimestamps as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.showTimestamps as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
