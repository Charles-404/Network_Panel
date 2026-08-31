import { query, getOne, getAll } from '../database/index.js';
import type { SystemStatus, ConnectedDevice, NetworkInterface, VpnConnection } from '../../frontend/types/index.js';

// ============================================================
// Alert Rules Engine
// ============================================================

export type RuleType = 'threshold' | 'status' | 'trend';
export type ConditionOp = 'greater_than' | 'less_than' | 'equals' | 'not_equals';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  id: number;
  name: string;
  type: RuleType;
  metric: string;
  condition: ConditionOp;
  threshold: number | null;
  severity: Severity;
  enabled: boolean;
  cooldown_seconds: number;
  description: string;
  notification_channels: string[];
  created_at: Date;
  updated_at: Date;
}

export interface RuleEvaluationResult {
  rule_id: number;
  rule_name: string;
  triggered: boolean;
  current_value: number | string | null;
  threshold: number | null;
  severity: Severity;
  message: string;
  metadata: Record<string, unknown>;
}

// ----------------------------------------------------------
// Historical value ring buffer (for trend rules)
// ----------------------------------------------------------
interface HistoricalSample {
  value: number;
  timestamp: number;
}

const historyBuffer: Map<string, HistoricalSample[]> = new Map();
const HISTORY_MAX_SAMPLES = 60; // keep last 60 samples (~5 min at 5s interval)

function recordHistory(metric: string, value: number): void {
  const list = historyBuffer.get(metric) || [];
  list.push({ value, timestamp: Date.now() });
  if (list.length > HISTORY_MAX_SAMPLES) {
    list.splice(0, list.length - HISTORY_MAX_SAMPLES);
  }
  historyBuffer.set(metric, list);
}

function getHistory(metric: string): HistoricalSample[] {
  return historyBuffer.get(metric) || [];
}

// ===========================================================
// AlertRulesEngine
// ===========================================================
export class AlertRulesEngine {
  private rules: AlertRule[] = [];
  private lastTriggered: Map<number, number> = new Map(); // ruleId -> epoch ms

  // -------------------------------------------------------
  // Load rules from DB (fallback to defaults on failure)
  // -------------------------------------------------------
  async loadRules(): Promise<void> {
    try {
      const rows = await getAll('SELECT * FROM alert_rules WHERE enabled = true ORDER BY id');
      this.rules = rows.map(this.mapRow) as AlertRule[];
      console.log(`[AlertRules] Loaded ${this.rules.length} active rules`);
    } catch (err) {
      console.warn('[AlertRules] Could not load rules from DB, using defaults:', (err as Error).message);
      this.rules = this.getDefaultRules();
    }
  }

  // -------------------------------------------------------
  // Evaluate all rules against current system data
  // -------------------------------------------------------
  async evaluateAll(data: {
    systemStatus: SystemStatus | null;
    devices: ConnectedDevice[];
    interfaces: NetworkInterface[];
    vpnConnections: VpnConnection[];
  }): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];

    // Record historical samples
    if (data.systemStatus) {
      recordHistory('cpu_usage', data.systemStatus.cpu);
      recordHistory('memory_usage', data.systemStatus.memory);
      recordHistory('session_count', data.systemStatus.sessionCount);
      recordHistory('session_rate', data.systemStatus.sessionRate);
      recordHistory('packet_rate', data.systemStatus.packetRate);
    }

    for (const rule of this.rules) {
      if (this.isInCooldown(rule)) continue;

      try {
        const result = this.evaluateRule(rule, data);
        if (result.triggered) {
          this.lastTriggered.set(rule.id, Date.now());
        }
        results.push(result);
      } catch (err) {
        console.error(`[AlertRules] Error evaluating rule ${rule.id} (${rule.name}):`, err);
      }
    }

    return results;
  }

  // -------------------------------------------------------
  // Single rule evaluation
  // -------------------------------------------------------
  private evaluateRule(rule: AlertRule, data: {
    systemStatus: SystemStatus | null;
    devices: ConnectedDevice[];
    interfaces: NetworkInterface[];
    vpnConnections: VpnConnection[];
  }): RuleEvaluationResult {
    const base: RuleEvaluationResult = {
      rule_id: rule.id,
      rule_name: rule.name,
      triggered: false,
      current_value: null,
      threshold: rule.threshold,
      severity: rule.severity,
      message: '',
      metadata: {},
    };

    switch (rule.type) {
      case 'threshold':
        return this.evaluateThreshold(rule, data.systemStatus, base);
      case 'status':
        return this.evaluateStatus(rule, data, base);
      case 'trend':
        return this.evaluateTrend(rule, data.systemStatus, base);
      default:
        return base;
    }
  }

  // -------------------------------------------------------
  // Threshold rules
  // -------------------------------------------------------
  private evaluateThreshold(
    rule: AlertRule,
    systemStatus: SystemStatus | null,
    base: RuleEvaluationResult
  ): RuleEvaluationResult {
    if (!systemStatus) return base;

    const metricMap: Record<string, number | undefined> = {
      cpu_usage: systemStatus.cpu,
      memory_usage: systemStatus.memory,
      temperature: systemStatus.temperature,
      session_count: systemStatus.sessionCount,
      session_rate: systemStatus.sessionRate,
      packet_rate: systemStatus.packetRate,
    };

    const currentValue = metricMap[rule.metric];
    if (currentValue === undefined) return base;

    base.current_value = currentValue;

    if (rule.threshold !== null) {
      base.triggered = this.compare(currentValue, rule.condition, rule.threshold);
    }

    if (base.triggered) {
      const opLabel: Record<string, string> = {
        greater_than: '>', less_than: '<', equals: '=', not_equals: '≠',
      };
      base.message = `${rule.name}: ${rule.metric} = ${currentValue}${opLabel[rule.condition] || rule.condition}${rule.threshold}`;
      base.metadata = { metric: rule.metric, condition: rule.condition };
    }

    return base;
  }

  // -------------------------------------------------------
  // Status rules
  // -------------------------------------------------------
  private evaluateStatus(
    rule: AlertRule,
    data: { devices: ConnectedDevice[]; vpnConnections: VpnConnection[] },
    base: RuleEvaluationResult
  ): RuleEvaluationResult {
    switch (rule.metric) {
      case 'device_online': {
        const offline = data.devices.filter(d => !d.isOnline);
        base.current_value = offline.length;
        base.triggered = offline.length > 0;
        if (base.triggered) {
          base.message = `${offline.length} 个设备离线: ${offline.map(d => d.name).join(', ')}`;
          base.metadata = {
            offline_devices: offline.map(d => ({ id: d.id, name: d.name, last_seen: d.lastSeen })),
          };
        }
        break;
      }
      case 'vpn_status': {
        const inactive = data.vpnConnections.filter(v => v.status !== 'active');
        base.current_value = inactive.length;
        base.triggered = inactive.length > 0;
        if (base.triggered) {
          base.message = `${inactive.length} 个 VPN 隧道非活动: ${inactive.map(v => v.name).join(', ')}`;
          base.metadata = {
            inactive_vpns: inactive.map(v => ({ id: v.id, name: v.name, status: v.status })),
          };
        }
        break;
      }
      case 'wan_status': {
        const downInterfaces = data.devices.filter(d => d.type === 'fortigate' && !d.isOnline);
        base.current_value = downInterfaces.length;
        base.triggered = downInterfaces.length > 0;
        if (base.triggered) {
          base.message = `WAN 接口状态异常`;
          base.metadata = { interfaces: downInterfaces.map(i => i.name) };
        }
        break;
      }
      default:
        break;
    }
    return base;
  }

  // -------------------------------------------------------
  // Trend rules (uses history buffer)
  // -------------------------------------------------------
  private evaluateTrend(
    rule: AlertRule,
    systemStatus: SystemStatus | null,
    base: RuleEvaluationResult
  ): RuleEvaluationResult {
    if (!systemStatus) return base;

    const metricMap: Record<string, number | undefined> = {
      traffic_rate: systemStatus.packetRate,
      session_rate: systemStatus.sessionRate,
      cpu_usage: systemStatus.cpu,
      memory_usage: systemStatus.memory,
    };

    const currentValue = metricMap[rule.metric];
    if (currentValue === undefined) return base;

    base.current_value = currentValue;
    const history = getHistory(rule.metric);

    if (history.length >= 10) {
      const recent10 = history.slice(-10);
      const avg = recent10.reduce((s, h) => s + h.value, 0) / recent10.length;
      const changePercent = avg > 0 ? ((currentValue - avg) / avg) * 100 : 0;

      if (rule.threshold !== null) {
        base.triggered = changePercent > rule.threshold;
      }

      if (base.triggered) {
        base.message = `${rule.name}: ${rule.metric} 突增 ${changePercent.toFixed(1)}%（均值 ${avg.toFixed(1)} → 当前 ${currentValue}）`;
        base.metadata = { metric: rule.metric, change_percent: changePercent, average: avg };
      }
    }

    return base;
  }

  // -------------------------------------------------------
  // Comparison helper
  // -------------------------------------------------------
  private compare(value: number, op: ConditionOp, threshold: number): boolean {
    switch (op) {
      case 'greater_than': return value > threshold;
      case 'less_than': return value < threshold;
      case 'equals': return value === threshold;
      case 'not_equals': return value !== threshold;
      default: return false;
    }
  }

  // -------------------------------------------------------
  // Cooldown check
  // -------------------------------------------------------
  private isInCooldown(rule: AlertRule): boolean {
    const last = this.lastTriggered.get(rule.id);
    if (!last) return false;
    return (Date.now() - last) < rule.cooldown_seconds * 1000;
  }

  // -------------------------------------------------------
  // Public accessors
  // -------------------------------------------------------
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  async createRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRule | null> {
    try {
      const sql = `
        INSERT INTO alert_rules (name, type, metric, condition, threshold, severity, enabled, cooldown_seconds, description, notification_channels)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `;
      const values = [
        rule.name, rule.type, rule.metric, rule.condition,
        rule.threshold, rule.severity, rule.enabled, rule.cooldown_seconds,
        rule.description, JSON.stringify(rule.notification_channels),
      ];
      const row = await getOne(sql, values);
      await this.loadRules();
      return row ? this.mapRow(row) : null;
    } catch (err) {
      console.error('[AlertRules] createRule failed:', err);
      return null;
    }
  }

  async updateRule(id: number, updates: Partial<AlertRule>): Promise<boolean> {
    try {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          const col = key === 'notification_channels' ? key : key;
          sets.push(`${col} = $${i}`);
          vals.push(key === 'notification_channels' ? JSON.stringify(value) : value);
          i++;
        }
      }
      if (sets.length === 0) return false;
      sets.push(`updated_at = NOW()`);
      vals.push(id);

      await query(`UPDATE alert_rules SET ${sets.join(', ')} WHERE id = $${i}`, vals);
      await this.loadRules();
      return true;
    } catch (err) {
      console.error('[AlertRules] updateRule failed:', err);
      return false;
    }
  }

  async deleteRule(id: number): Promise<boolean> {
    try {
      await query('DELETE FROM alert_rules WHERE id = $1', [id]);
      await this.loadRules();
      return true;
    } catch (err) {
      console.error('[AlertRules] deleteRule failed:', err);
      return false;
    }
  }

  // -------------------------------------------------------
  // Map DB row to typed object
  // -------------------------------------------------------
  private mapRow(row: any): AlertRule {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      metric: row.metric,
      condition: row.condition,
      threshold: row.threshold !== null ? Number(row.threshold) : null,
      severity: row.severity,
      enabled: row.enabled,
      cooldown_seconds: row.cooldown_seconds,
      description: row.description || '',
      notification_channels: typeof row.notification_channels === 'string'
        ? JSON.parse(row.notification_channels)
        : row.notification_channels || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // -------------------------------------------------------
  // Default rules (used when DB is unavailable)
  // -------------------------------------------------------
  private getDefaultRules(): AlertRule[] {
    const now = new Date();
    return [
      {
        id: 1, name: 'CPU使用率过高', type: 'threshold', metric: 'cpu_usage',
        condition: 'greater_than', threshold: 90, severity: 'high', enabled: true,
        cooldown_seconds: 300, description: 'CPU使用率超过90%',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
      {
        id: 2, name: '内存使用率过高', type: 'threshold', metric: 'memory_usage',
        condition: 'greater_than', threshold: 85, severity: 'high', enabled: true,
        cooldown_seconds: 300, description: '内存使用率超过85%',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
      {
        id: 3, name: '会话数过多', type: 'threshold', metric: 'session_count',
        condition: 'greater_than', threshold: 10000, severity: 'medium', enabled: true,
        cooldown_seconds: 600, description: '活动会话数超过10000',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
      {
        id: 4, name: '设备离线告警', type: 'status', metric: 'device_online',
        condition: 'greater_than', threshold: 0, severity: 'critical', enabled: true,
        cooldown_seconds: 60, description: '设备离线超过1分钟',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
      {
        id: 5, name: 'VPN隧道断开', type: 'status', metric: 'vpn_status',
        condition: 'greater_than', threshold: 0, severity: 'critical', enabled: true,
        cooldown_seconds: 120, description: 'VPN隧道断开超过2分钟',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
      {
        id: 6, name: '流量突增', type: 'trend', metric: 'traffic_rate',
        condition: 'greater_than', threshold: 500, severity: 'medium', enabled: true,
        cooldown_seconds: 900, description: '流量突增超过500%',
        notification_channels: ['webhook'], created_at: now, updated_at: now,
      },
    ];
  }
}

// Singleton
export const alertRulesEngine = new AlertRulesEngine();
