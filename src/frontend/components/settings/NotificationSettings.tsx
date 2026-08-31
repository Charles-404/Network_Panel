import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Webhook, Volume2, Monitor, AlertTriangle } from 'lucide-react';

interface NotificationSettingsProps {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const severityLevels = [
  {
    key: 'notifyOnCritical',
    label: '严重',
    description: '系统崩溃、服务中断等紧急情况',
    color: 'bg-noc-red',
    textColor: 'text-noc-red',
  },
  {
    key: 'notifyOnHigh',
    label: '高',
    description: '性能严重下降、资源耗尽等',
    color: 'bg-noc-orange',
    textColor: 'text-noc-orange',
  },
  {
    key: 'notifyOnMedium',
    label: '中',
    description: '性能轻微下降、警告阈值触发',
    color: 'bg-noc-yellow',
    textColor: 'text-noc-yellow',
  },
  {
    key: 'notifyOnLow',
    label: '低',
    description: '信息性通知、状态变化',
    color: 'bg-noc-blue',
    textColor: 'text-noc-blue',
  },
];

export function NotificationSettings({ settings, onChange }: NotificationSettingsProps) {
  const [testingWebhook, setTestingWebhook] = useState(false);

  const handleTestWebhook = async () => {
    const webhookUrl = settings.webhookUrl as string;
    if (!webhookUrl) {
      alert('请先配置 Webhook URL');
      return;
    }

    setTestingWebhook(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          message: 'FortiGate 网络监控面板 - 测试通知',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('测试通知发送成功！');
      } else {
        alert('测试通知发送失败：' + response.statusText);
      }
    } catch (err) {
      alert('测试通知发送失败：无法连接到 Webhook URL');
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-noc-text mb-4">通知设置</h3>
        <p className="text-sm text-noc-text-muted mb-6">
          配置告警通知方式和级别过滤
        </p>
      </div>

      {/* Master Toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-noc-purple" />
          <label className="text-sm font-medium text-noc-text">通知开关</label>
        </div>
        <label className="flex items-center justify-between p-4 bg-noc-bg rounded-lg cursor-pointer">
          <div>
            <div className="text-sm text-noc-text font-medium">启用通知</div>
            <div className="text-xs text-noc-text-muted mt-1">
              开启后将根据下方配置发送告警通知
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={(settings.enabled as boolean) !== false}
              onChange={(e) => onChange('enabled', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'w-11 h-6 rounded-full transition-colors',
              (settings.enabled as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform',
                (settings.enabled as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </div>
          </div>
        </label>
      </div>

      {/* Webhook URL */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-noc-green" />
          <label className="text-sm font-medium text-noc-text">Webhook URL</label>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={(settings.webhookUrl as string) || ''}
            onChange={(e) => onChange('webhookUrl', e.target.value)}
            placeholder="https://hooks.example.com/webhook"
            className="flex-1 px-3 py-2 bg-noc-bg border border-noc-border rounded text-noc-text placeholder-noc-text-muted focus:outline-none focus:border-noc-purple"
          />
          <button
            onClick={handleTestWebhook}
            disabled={testingWebhook || !(settings.webhookUrl as string)}
            className={cn(
              'px-4 py-2 rounded text-sm transition-colors',
              testingWebhook || !(settings.webhookUrl as string)
                ? 'bg-noc-bg text-noc-text-muted cursor-not-allowed'
                : 'bg-noc-green/20 text-noc-green hover:bg-noc-green/30'
            )}
          >
            {testingWebhook ? '发送中...' : '测试'}
          </button>
        </div>
        <p className="text-xs text-noc-text-muted">
          支持 Slack、Discord、飞书、企业微信等 Webhook 服务
        </p>
      </div>

      {/* Severity Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-noc-yellow" />
          <label className="text-sm font-medium text-noc-text">通知级别</label>
        </div>
        <p className="text-xs text-noc-text-muted mb-3">
          选择需要接收通知的告警级别
        </p>
        <div className="space-y-2">
          {severityLevels.map(level => (
            <label
              key={level.key}
              className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-3 h-3 rounded-full', level.color)} />
                <div>
                  <div className={cn('text-sm font-medium', level.textColor)}>
                    {level.label}
                  </div>
                  <div className="text-xs text-noc-text-muted">{level.description}</div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={(settings[level.key] as boolean) === true}
                  onChange={(e) => onChange(level.key, e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  'w-11 h-6 rounded-full transition-colors',
                  (settings[level.key] as boolean) === true ? 'bg-noc-purple' : 'bg-noc-border'
                )}>
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform',
                    (settings[level.key] as boolean) === true ? 'translate-x-5' : 'translate-x-0.5'
                  )} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Sound & Desktop */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-noc-orange" />
          <label className="text-sm font-medium text-noc-text">通知方式</label>
        </div>
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">声音提醒</div>
              <div className="text-xs text-noc-text-muted">收到告警时播放提示音</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.soundEnabled as boolean) !== false}
                onChange={(e) => onChange('soundEnabled', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.soundEnabled as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.soundEnabled as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-3 bg-noc-bg rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-noc-blue" />
              <div>
                <div className="text-sm text-noc-text">桌面通知</div>
                <div className="text-xs text-noc-text-muted">使用浏览器桌面通知功能</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(settings.desktopNotifications as boolean) === true}
                onChange={(e) => onChange('desktopNotifications', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (settings.desktopNotifications as boolean) === true ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (settings.desktopNotifications as boolean) === true ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
