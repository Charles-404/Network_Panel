import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  User,
  Bell,
  Monitor,
  Server,
  Save,
  RotateCcw,
  Download,
  Upload,
  X,
} from 'lucide-react';

// Import tab components
import { GeneralSettings } from './GeneralSettings';
import { DisplaySettings } from './DisplaySettings';
import { NotificationSettings } from './NotificationSettings';
import { SystemSettings } from './SystemSettings';

const API_BASE = 'http://' + window.location.hostname + ':3001';

type TabId = 'general' | 'display' | 'notification' | 'system';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  { id: 'general', label: '通用', icon: User, description: '语言、时区、日期格式' },
  { id: 'display', label: '显示', icon: Monitor, description: '主题、刷新间隔、图表选项' },
  { id: 'notification', label: '通知', icon: Bell, description: '告警通知、Webhook 配置' },
  { id: 'system', label: '系统', icon: Server, description: 'SNMP、Syslog、FortiGate 配置' },
];

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPage({ isOpen, onClose }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load user settings
      const userRes = await fetch(API_BASE + '/api/settings');
      const userData = await userRes.json();

      // Load system settings
      const sysRes = await fetch(API_BASE + '/api/settings/system');
      const sysData = await sysRes.json();

      if (userData.success && sysData.success) {
        setSettings({
          ...userData.data,
          system: sysData.data,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: string, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save user settings
      const { system, ...userSettings } = settings;
      await fetch(API_BASE + '/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: userSettings }),
      });

      // Save system settings
      if (system) {
        await fetch(API_BASE + '/api/settings/system', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: system }),
        });
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置所有设置为默认值吗？')) return;

    try {
      await fetch(API_BASE + '/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await loadSettings();
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(API_BASE + '/api/settings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-panel-settings-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export settings:', err);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const res = await fetch(API_BASE + '/api/settings/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
        const result = await res.json();

        if (result.success) {
          await loadSettings();
          setHasChanges(false);
          alert(`成功导入 ${result.data.imported} 项设置`);
        }
      } catch (err) {
        console.error('Failed to import settings:', err);
        alert('导入失败：文件格式无效');
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-noc-card rounded-lg shadow-xl border border-noc-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-noc-border">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-noc-purple" />
            <div>
              <h2 className="text-lg font-semibold text-noc-text">设置</h2>
              <p className="text-xs text-noc-text-muted">配置系统参数和偏好</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-noc-yellow px-2 py-1 bg-noc-yellow/10 rounded">
                有未保存的更改
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-noc-bg rounded transition-colors"
            >
              <X className="w-5 h-5 text-noc-text-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-8rem)]">
          {/* Sidebar */}
          <div className="w-56 border-r border-noc-border bg-noc-bg/50 p-3">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors',
                      activeTab === tab.id
                        ? 'bg-noc-purple/20 text-noc-purple'
                        : 'text-noc-text-muted hover:bg-noc-card hover:text-noc-text'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs opacity-70">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-noc-border space-y-2">
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-noc-text-muted hover:text-noc-text hover:bg-noc-card rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                导出设置
              </button>
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-noc-text-muted hover:text-noc-text hover:bg-noc-card rounded transition-colors"
              >
                <Upload className="w-4 h-4" />
                导入设置
              </button>
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-noc-red hover:bg-noc-red/10 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置默认
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-noc-text-muted">加载中...</div>
              </div>
            ) : (
              <>
                {activeTab === 'general' && (
                  <GeneralSettings
                    settings={settings.general || {}}
                    onChange={(key, value) => handleSettingChange('general', key, value)}
                  />
                )}
                {activeTab === 'display' && (
                  <DisplaySettings
                    settings={settings.display || {}}
                    onChange={(key, value) => handleSettingChange('display', key, value)}
                  />
                )}
                {activeTab === 'notification' && (
                  <NotificationSettings
                    settings={settings.notification || {}}
                    onChange={(key, value) => handleSettingChange('notification', key, value)}
                  />
                )}
                {activeTab === 'system' && (
                  <SystemSettings
                    settings={settings.system || {}}
                    onChange={(key, value) => handleSettingChange('system', key, value)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-noc-border bg-noc-bg/50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-noc-text-muted hover:text-noc-text transition-colors"
          >
            重置为默认值
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-noc-text-muted hover:text-noc-text transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors',
                hasChanges && !saving
                  ? 'bg-noc-purple text-white hover:bg-noc-purple/90'
                  : 'bg-noc-bg text-noc-text-muted cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
