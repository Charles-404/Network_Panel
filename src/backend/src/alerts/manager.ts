import { query, getOne, getAll } from '../database/index.js';
import type { RuleEvaluationResult, Severity } from './rules.js';
import { alertRulesEngine } from './rules.js';

// ============================================================
// Alert Manager – lifecycle, dedup, notifications
// ============================================================

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: number;
  rule_id: number | null;
  type: string;
  severity: Severity;
  title: string;
  message: string;
  source: string;
  status: AlertStatus;
  metadata: Record<string, unknown>;
  created_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  last_notified_at: Date | null;
}

export interface AlertHistoryEntry {
  id: number;
  alert_id: number;
  action: string;
  actor: string;
  details: string | null;
  created_at: Date;
}

// ----------------------------------------------------------
// Notification channel interface (extensible)
// ----------------------------------------------------------
export interface NotificationChannel {
  name: string;
  send(alert: Alert): Promise<void>;
}

class WebhookChannel implements NotificationChannel {
  name = 'webhook';
  private url: string;

  constructor() {
    this.url = process.env.ALERT_WEBHOOK_URL || '';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.url) return;
    try {
      const payload = {
        alert_id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        source: alert.source,
        status: alert.status,
        created_at: alert.created_at,
      };
      // Fire-and-forget (non-blocking)
      fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // silently ignore webhook failures
    }
  }
}

// Email channel stub (ready for future implementation)
class EmailChannel implements NotificationChannel {
  name = 'email';
  async send(_alert: Alert): Promise<void> {
    // TODO: integrate with SMTP or SendGrid
    console.log('[AlertManager] Email notification stub:', _alert.title);
  }
}

// ===========================================================
// AlertManager
// ===========================================================
export class AlertManager {
  private channels: NotificationChannel[] = [];
  private deduplicationWindow = 60_000; // 1 min – same rule won't create duplicate alerts within this window

  constructor() {
    this.channels.push(new WebhookChannel(), new EmailChannel());
  }

  // -------------------------------------------------------
  // Process evaluation results from the rules engine
  // -------------------------------------------------------
  async processEvaluationResults(results: RuleEvaluationResult[]): Promise<Alert[]> {
    const created: Alert[] = [];

    for (const result of results) {
      if (!result.triggered) continue;

      // Dedup: check if an active alert for this rule already exists within window
      const existing = await this.findActiveAlertByRule(result.rule_id);
      if (existing) {
        // Update message & metadata if needed
        await this.updateAlert(existing.id, {
          message: result.message,
          metadata: result.metadata,
        });
        continue;
      }

      const alert = await this.createAlert({
        rule_id: result.rule_id,
        type: result.rule_name,
        severity: result.severity,
        title: result.rule_name,
        message: result.message,
        source: 'rules_engine',
        metadata: result.metadata,
      });

      if (alert) {
        created.push(alert);
        await this.notify(alert);
      }
    }

    return created;
  }

  // -------------------------------------------------------
  // CRUD operations
  // -------------------------------------------------------
  async createAlert(data: {
    rule_id: number | null;
    type: string;
    severity: Severity;
    title: string;
    message: string;
    source: string;
    metadata?: Record<string, unknown>;
  }): Promise<Alert | null> {
    try {
      const sql = `
        INSERT INTO alerts (rule_id, type, severity, title, message, source, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
        RETURNING *
      `;
      const values = [
        data.rule_id, data.type, data.severity, data.title,
        data.message, data.source, JSON.stringify(data.metadata || {}),
      ];
      const row = await getOne(sql, values);
      const alert = this.mapRow(row);

      // Record history
      await this.addHistory(alert.id, 'created', 'system', data.message);

      console.log(`[AlertManager] Alert created: #${alert.id} [${alert.severity}] ${alert.title}`);
      return alert;
    } catch (err) {
      console.error('[AlertManager] createAlert failed:', err);
      return null;
    }
  }

  async acknowledgeAlert(id: number, actor = 'user'): Promise<Alert | null> {
    try {
      const row = await getOne(
        `UPDATE alerts SET status = 'acknowledged', acknowledged_at = NOW() WHERE id = $1 AND status = 'active' RETURNING *`,
        [id]
      );
      if (!row) return null;

      const alert = this.mapRow(row);
      await this.addHistory(id, 'acknowledged', actor, '告警已确认');
      console.log(`[AlertManager] Alert acknowledged: #${id}`);
      return alert;
    } catch (err) {
      console.error('[AlertManager] acknowledgeAlert failed:', err);
      return null;
    }
  }

  async resolveAlert(id: number, actor = 'user', reason?: string): Promise<Alert | null> {
    try {
      const row = await getOne(
        `UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND status IN ('active', 'acknowledged') RETURNING *`,
        [id]
      );
      if (!row) return null;

      const alert = this.mapRow(row);
      await this.addHistory(id, 'resolved', actor, reason || '告警已解决');
      console.log(`[AlertManager] Alert resolved: #${id}`);
      return alert;
    } catch (err) {
      console.error('[AlertManager] resolveAlert failed:', err);
      return null;
    }
  }

  async updateAlert(id: number, updates: { message?: string; metadata?: Record<string, unknown> }): Promise<void> {
    try {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      if (updates.message !== undefined) {
        sets.push(`message = $${i++}`);
        vals.push(updates.message);
      }
      if (updates.metadata !== undefined) {
        sets.push(`metadata = $${i++}`);
        vals.push(JSON.stringify(updates.metadata));
      }
      if (sets.length > 0) {
        vals.push(id);
        await query(`UPDATE alerts SET ${sets.join(', ')} WHERE id = $${i}`, vals);
      }
    } catch (err) {
      console.error('[AlertManager] updateAlert failed:', err);
    }
  }

  // -------------------------------------------------------
  // Query helpers
  // -------------------------------------------------------
  async getAlerts(options: {
    status?: AlertStatus;
    severity?: Severity;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ alerts: Alert[]; total: number }> {
    const { status, severity, limit = 50, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (severity) {
      conditions.push(`severity = $${idx++}`);
      params.push(severity);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await getOne(`SELECT COUNT(*) as total FROM alerts ${where}`, params);
    const total = parseInt((countRow as any)?.total || '0', 10);

    const rows = await getAll(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return { alerts: rows.map(this.mapRow), total };
  }

  async getAlert(id: number): Promise<Alert | null> {
    const row = await getOne('SELECT * FROM alerts WHERE id = $1', [id]);
    return row ? this.mapRow(row) : null;
  }

  async getActiveAlertCount(): Promise<number> {
    const row = await getOne("SELECT COUNT(*) as count FROM alerts WHERE status = 'active'");
    return parseInt((row as any)?.count || '0', 10);
  }

  async getAlertHistory(alertId: number): Promise<AlertHistoryEntry[]> {
    const rows = await getAll(
      'SELECT * FROM alert_history WHERE alert_id = $1 ORDER BY created_at DESC',
      [alertId]
    );
    return rows as AlertHistoryEntry[];
  }

  async getRecentAlertHistory(limit = 20): Promise<AlertHistoryEntry[]> {
    const rows = await getAll(
      'SELECT * FROM alert_history ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows as AlertHistoryEntry[];
  }

  // -------------------------------------------------------
  // Purge old resolved alerts
  // -------------------------------------------------------
  async purgeOldAlerts(daysOld = 30): Promise<number> {
    try {
      const result = await query(
        "DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '" + daysOld + " days'"
      );
      return result.rowCount || 0;
    } catch (err) {
      console.error('[AlertManager] purgeOldAlerts failed:', err);
      return 0;
    }
  }

  // -------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------
  private async findActiveAlertByRule(ruleId: number): Promise<Alert | null> {
    const windowAgo = new Date(Date.now() - this.deduplicationWindow);
    const row = await getOne(
      "SELECT * FROM alerts WHERE rule_id = $1 AND status = 'active' AND created_at > $2 LIMIT 1",
      [ruleId, windowAgo]
    );
    return row ? this.mapRow(row) : null;
  }

  private async addHistory(alertId: number, action: string, actor: string, details: string | null): Promise<void> {
    try {
      await query(
        'INSERT INTO alert_history (alert_id, action, actor, details) VALUES ($1, $2, $3, $4)',
        [alertId, action, actor, details]
      );
    } catch (err) {
      console.error('[AlertManager] addHistory failed:', err);
    }
  }

  private async notify(alert: Alert): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.send(alert);
      } catch {
        // ignore notification errors
      }
    }
    // Update last_notified_at
    await query('UPDATE alerts SET last_notified_at = NOW() WHERE id = $1', [alert.id]);
  }

  private mapRow(row: any): Alert {
    return {
      id: row.id,
      rule_id: row.rule_id !== undefined ? row.rule_id : null,
      type: row.type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      source: row.source || 'unknown',
      status: row.status,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      created_at: row.created_at,
      acknowledged_at: row.acknowledged_at || null,
      resolved_at: row.resolved_at || null,
      last_notified_at: row.last_notified_at || null,
    };
  }
}

// Singleton
export const alertManager = new AlertManager();
