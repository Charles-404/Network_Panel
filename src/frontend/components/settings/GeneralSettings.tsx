import { cn } from '@/lib/utils';
import { Globe, Clock, Calendar } from 'lucide-react';

interface GeneralSettingsProps {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja-JP', label: '日本語' },
];

const timezones = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
  { value: 'America/New_York', label: '美国东部时间 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间 (UTC-8)' },
  { value: 'Europe/London', label: '格林威治标准时间 (UTC+0)' },
  { value: 'Europe/Berlin', label: '中欧时间 (UTC+1)' },
];

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-01-15' },
  { value: 'DD/MM/YYYY', label: '15/01/2024' },
  { value: 'MM/DD/YYYY', label: '01/15/2024' },
  { value: 'YYYY年MM月DD日', label: '2024年01月15日' },
];

const timeFormats = [
  { value: '24h', label: '24小时制 (14:30)' },
  { value: '12h', label: '12小时制 (2:30 PM)' },
];

export function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-noc-text mb-4">通用设置</h3>
        <p className="text-sm text-noc-text-muted mb-6">
          配置语言、时区和日期时间格式
        </p>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-noc-blue" />
          <label className="text-sm font-medium text-noc-text">界面语言</label>
        </div>
        <select
          value={(settings.language as string) || 'zh-CN'}
          onChange={(e) => onChange('language', e.target.value)}
          className="w-full px-3 py-2 bg-noc-bg border border-noc-border rounded text-noc-text focus:outline-none focus:border-noc-purple"
        >
          {languages.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <p className="text-xs text-noc-text-muted">
          更改语言需要刷新页面才能完全生效
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-noc-green" />
          <label className="text-sm font-medium text-noc-text">时区</label>
        </div>
        <select
          value={(settings.timezone as string) || 'Asia/Shanghai'}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="w-full px-3 py-2 bg-noc-bg border border-noc-border rounded text-noc-text focus:outline-none focus:border-noc-purple"
        >
          {timezones.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <p className="text-xs text-noc-text-muted">
          当前时间：{new Date().toLocaleString('zh-CN', { timeZone: (settings.timezone as string) || 'Asia/Shanghai' })}
        </p>
      </div>

      {/* Date Format */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-noc-purple" />
          <label className="text-sm font-medium text-noc-text">日期格式</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dateFormats.map(format => (
            <button
              key={format.value}
              onClick={() => onChange('dateFormat', format.value)}
              className={cn(
                'px-4 py-3 rounded border text-left transition-colors',
                (settings.dateFormat as string) === format.value
                  ? 'border-noc-purple bg-noc-purple/10 text-noc-purple'
                  : 'border-noc-border bg-noc-bg text-noc-text-muted hover:border-noc-text-muted'
              )}
            >
              <div className="text-sm font-mono">{format.label}</div>
              <div className="text-xs mt-1 opacity-70">{format.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Format */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-noc-orange" />
          <label className="text-sm font-medium text-noc-text">时间格式</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {timeFormats.map(format => (
            <button
              key={format.value}
              onClick={() => onChange('timeFormat', format.value)}
              className={cn(
                'px-4 py-3 rounded border text-left transition-colors',
                (settings.timeFormat as string) === format.value
                  ? 'border-noc-purple bg-noc-purple/10 text-noc-purple'
                  : 'border-noc-border bg-noc-bg text-noc-text-muted hover:border-noc-text-muted'
              )}
            >
              <div className="text-sm">{format.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
