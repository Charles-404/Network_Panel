// Alerts module – public API
export { alertRulesEngine, AlertRulesEngine } from './rules.js';
export type { AlertRule, RuleType, ConditionOp, Severity, RuleEvaluationResult } from './rules.js';

export { alertManager, AlertManager } from './manager.js';
export type { Alert, AlertStatus, AlertHistoryEntry, NotificationChannel } from './manager.js';
