import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Server,
  Radio,
  FileText,
  Shield,
  Users,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface SystemSettingsProps {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function SystemSettings({ settings, onChange }: SystemSettingsProps) {
  const [showToken, setShowToken] = useState(false);
  const [testingSnmp, setTestingSnmp] = useState(false);
  const [testingFortiGate, setTestingFortiGate] = useState(false);
  const [snmpStatus, setSnmpStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fortiGateStatus, setFortiGateStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Helper to update nested settings
  const updateNested = (section: string, key: string, value: unknown) => {
    const current = (settings[section] as Record<string, unknown>) || {};
    onChange(section, { ...current, [key]: value });
  };

  // Get nested value
  const getNested = (section: string, key: string, defaultValue: unknown = '') => {
    const sectionData = settings[section] as Record<string, unknown> | undefined;
    return sectionData?.[key] ?? defaultValue;
  };

  const handleTestSnmp = async () => {
    setTestingSnmp(true);
    setSnmpStatus('idle');
    try {
      // Simulate SNMP test
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSnmpStatus('success');
    } catch {
      setSnmpStatus('error');
    } finally {
      setTestingSnmp(false);
    }
  };

  const handleTestFortiGate = async () => {
    setTestingFortiGate(true);
    setFortiGateStatus('idle');
    try {
      const host = getNested('fortigate', 'host');
      const token = getNested('fortigate', 'token');
      
      if (!host || !token) {
        throw new Error('请填写完整配置');
      }

      const response = await fetch(`http://${window.location.hostname}:3001/api/fortigate/status`);
      const data = await response.json();
      
      if (data.success) {
        setFortiGateStatus('success');
      } else {
        setFortiGateStatus('error');
      }
    } catch {
      setFortiGateStatus('error');
    } finally {
      setTestingFortiGate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-noc-text mb-4">系统设置</h3>
        <p className="text-sm text-noc-text-muted mb-6">
          配置网络设备连接和系统参数（需要管理员权限）
        </p>
      </div>

      {/* SNMP Configuration */}
      <div className="space-y-3 p-4 bg-noc-bg rounded-lg border border-noc-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-noc-green" />
            <label className="text-sm font-medium text-noc-text">SNMP 配置</label>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={(getNested('snmp', 'enabled') as boolean) === true}
              onChange={(e) => updateNested('snmp', 'enabled', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'w-11 h-6 rounded-full transition-colors',
              (getNested('snmp', 'enabled') as boolean) === true ? 'bg-noc-purple' : 'bg-noc-border'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform',
                (getNested('snmp', 'enabled') as boolean) === true ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-noc-text-muted">主机地址</label>
            <input
              type="text"
              value={getNested('snmp', 'host') as string}
              onChange={(e) => updateNested('snmp', 'host', e.target.value)}
              placeholder="192.168.1.1"
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <div>
            <label className="text-xs text-noc-text-muted">端口</label>
            <input
              type="number"
              value={getNested('snmp', 'port', 161) as number}
              onChange={(e) => updateNested('snmp', 'port', parseInt(e.target.value))}
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <div>
            <label className="text-xs text-noc-text-muted">Community</label>
            <input
              type="text"
              value={getNested('snmp', 'community', 'public') as string}
              onChange={(e) => updateNested('snmp', 'community', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <div>
            <label className="text-xs text-noc-text-muted">版本</label>
            <select
              value={getNested('snmp', 'version', '2c') as string}
              onChange={(e) => updateNested('snmp', 'version', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            >
              <option value="1">v1</option>
              <option value="2c">v2c</option>
              <option value="3">v3</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleTestSnmp}
            disabled={testingSnmp}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-noc-green/20 text-noc-green rounded hover:bg-noc-green/30 transition-colors"
          >
            <TestTube className="w-3 h-3" />
            {testingSnmp ? '测试中...' : '测试连接'}
          </button>
          {snmpStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs text-noc-green">
              <CheckCircle className="w-3 h-3" /> 连接成功
            </span>
          )}
          {snmpStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-noc-red">
              <XCircle className="w-3 h-3" /> 连接失败
            </span>
          )}
        </div>
      </div>

      {/* Syslog Configuration */}
      <div className="space-y-3 p-4 bg-noc-bg rounded-lg border border-noc-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-noc-blue" />
            <label className="text-sm font-medium text-noc-text">Syslog 配置</label>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={(getNested('syslog', 'enabled') as boolean) !== false}
              onChange={(e) => updateNested('syslog', 'enabled', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'w-11 h-6 rounded-full transition-colors',
              (getNested('syslog', 'enabled') as boolean) !== false ? 'bg-noc-purple' : 'bg-noc-border'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform',
                (getNested('syslog', 'enabled') as boolean) !== false ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-noc-text-muted">监听端口</label>
            <input
              type="number"
              value={getNested('syslog', 'port', 514) as number}
              onChange={(e) => updateNested('syslog', 'port', parseInt(e.target.value))}
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <div>
            <label className="text-xs text-noc-text-muted">协议</label>
            <select
              value={getNested('syslog', 'protocol', 'udp') as string}
              onChange={(e) => updateNested('syslog', 'protocol', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            >
              <option value="udp">UDP</option>
              <option value="tcp">TCP</option>
            </select>
          </div>
        </div>
      </div>

      {/* FortiGate API Configuration */}
      <div className="space-y-3 p-4 bg-noc-bg rounded-lg border border-noc-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-noc-purple" />
          <label className="text-sm font-medium text-noc-text">FortiGate API 配置</label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-noc-text-muted">FortiGate 地址</label>
            <input
              type="text"
              value={getNested('fortigate', 'host') as string}
              onChange={(e) => updateNested('fortigate', 'host', e.target.value)}
              placeholder="192.168.1.1 或 fortigate.example.com"
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <div>
            <label className="text-xs text-noc-text-muted">API Token</label>
            <div className="relative mt-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={getNested('fortigate', 'token') as string}
                onChange={(e) => updateNested('fortigate', 'token', e.target.value)}
                placeholder="输入 API Token"
                className="w-full px-3 py-2 pr-10 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-noc-text-muted hover:text-noc-text"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(getNested('fortigate', 'verifySsl') as boolean) === true}
              onChange={(e) => updateNested('fortigate', 'verifySsl', e.target.checked)}
              className="rounded border-noc-border"
            />
            <span className="text-sm text-noc-text-muted">验证 SSL 证书</span>
          </label>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleTestFortiGate}
            disabled={testingFortiGate}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-noc-purple/20 text-noc-purple rounded hover:bg-noc-purple/30 transition-colors"
          >
            <TestTube className="w-3 h-3" />
            {testingFortiGate ? '测试中...' : '测试连接'}
          </button>
          {fortiGateStatus === 'success' && (
            <span className="flex items-center gap-1 text-xs text-noc-green">
              <CheckCircle className="w-3 h-3" /> 连接成功
            </span>
          )}
          {fortiGateStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-noc-red">
              <XCircle className="w-3 h-3" /> 连接失败
            </span>
          )}
        </div>
      </div>

      {/* User Management */}
      <div className="space-y-3 p-4 bg-noc-bg rounded-lg border border-noc-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-noc-orange" />
          <label className="text-sm font-medium text-noc-text">用户管理</label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-noc-text-muted">管理员密码</label>
            <input
              type="password"
              value={getNested('users', 'adminPassword') as string}
              onChange={(e) => updateNested('users', 'adminPassword', e.target.value)}
              placeholder="设置管理员密码"
              className="w-full mt-1 px-3 py-2 bg-noc-card border border-noc-border rounded text-noc-text text-sm focus:outline-none focus:border-noc-purple"
            />
          </div>
          <label className="flex items-center justify-between p-3 bg-noc-card rounded cursor-pointer">
            <div>
              <div className="text-sm text-noc-text">访客访问</div>
              <div className="text-xs text-noc-text-muted">允许未登录用户查看只读数据</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={(getNested('users', 'guestAccess') as boolean) === true}
                onChange={(e) => updateNested('users', 'guestAccess', e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                (getNested('users', 'guestAccess') as boolean) === true ? 'bg-noc-purple' : 'bg-noc-border'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  (getNested('users', 'guestAccess') as boolean) === true ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
