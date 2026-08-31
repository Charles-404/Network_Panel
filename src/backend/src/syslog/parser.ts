/**
 * Syslog Message Parser
 * Supports RFC 3164, RFC 5424, and FortiGate-specific formats
 */

export type SyslogSeverity = 'emerg' | 'alert' | 'crit' | 'err' | 'warning' | 'notice' | 'info' | 'debug';
export type SyslogFacility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7';

export interface ParsedSyslogMessage {
  timestamp: Date;
  hostname: string;
  appName: string;
  procId?: string;
  msgId?: string;
  message: string;
  severity: SyslogSeverity;
  facility: SyslogFacility;
  priority: number;
  version?: string;
  structuredData?: Record<string, Record<string, string>>;
  cefData?: CefData;
  rawData: string;
  sourceIp?: string;
  isFortiGate: boolean;
}

export interface CefData {
  version: string;
  deviceVendor: string;
  deviceProduct: string;
  deviceVersion: string;
  signatureId: string;
  name: string;
  severity: string;
  extensions: Record<string, string>;
}

const SEVERITY_MAP: Record<number, SyslogSeverity> = {
  0: 'emerg', 1: 'alert', 2: 'crit', 3: 'err',
  4: 'warning', 5: 'notice', 6: 'info', 7: 'debug'
};

const FACILITY_MAP: Record<number, SyslogFacility> = {
  0: 'kern', 1: 'user', 2: 'mail', 3: 'daemon', 4: 'auth', 5: 'syslog',
  6: 'lpr', 7: 'news', 8: 'uucp', 9: 'cron', 10: 'authpriv', 11: 'ftp',
  16: 'local0', 17: 'local1', 18: 'local2', 19: 'local3',
  20: 'local4', 21: 'local5', 22: 'local6', 23: 'local7'
};

/**
 * Map syslog severity to database EventLevel
 */
export function severityToEventLevel(severity: SyslogSeverity): 'info' | 'warning' | 'error' | 'critical' {
  switch (severity) {
    case 'emerg':
    case 'alert':
    case 'crit':
      return 'critical';
    case 'err':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * Parse priority field: <PRI> where PRI = facility * 8 + severity
 */
function parsePriority(priStr: string): { facility: SyslogFacility; severity: SyslogSeverity; priority: number } {
  const priority = parseInt(priStr, 10);
  const facilityNum = Math.floor(priority / 8);
  const severityNum = priority % 8;
  return {
    facility: FACILITY_MAP[facilityNum] || 'user',
    severity: SEVERITY_MAP[severityNum] || 'info',
    priority
  };
}

/**
 * Parse RFC 3164 format: <PRI>TIMESTAMP HOSTNAME APP[PID]: MSG
 * Example: <134>Aug 31 12:34:56 FortiGate-30E sshd[1234]: Accepted publickey
 */
function parseRFC3164(raw: string, sourceIp?: string): ParsedSyslogMessage | null {
  // Match: <PRI>TIMESTAMP HOSTNAME APP-NAME[PID]: MSG
  const regex = /^<(\d+)>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?\s*:\s*(.*)/s;
  const match = raw.match(regex);

  if (!match) return null;

  const [, priStr, timestampStr, hostname, appName, procId, message] = match;
  const { facility, severity, priority } = parsePriority(priStr);

  // Parse timestamp (assume current year)
  const currentYear = new Date().getFullYear();
  const timestamp = new Date(`${timestampStr} ${currentYear}`);
  if (isNaN(timestamp.getTime())) {
    // Fallback to current time
    return {
      timestamp: new Date(),
      hostname,
      appName,
      procId: procId || undefined,
      message: message.trim(),
      severity,
      facility,
      priority,
      rawData: raw,
      sourceIp,
      isFortiGate: detectFortiGate(hostname, appName, message),
    };
  }

  return {
    timestamp,
    hostname,
    appName,
    procId: procId || undefined,
    message: message.trim(),
    severity,
    facility,
    priority,
    rawData: raw,
    sourceIp,
    isFortiGate: detectFortiGate(hostname, appName, message),
  };
}

/**
 * Parse RFC 5424 format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [STRUCTURED-DATA] MSG
 * Example: <165>1 2024-08-31T12:34:56.789Z mymachine.example.com evntslog - ID47 [exampleSDID@32473 iut="3"] BOMAn application event log entry...
 */
function parseRFC5424(raw: string, sourceIp?: string): ParsedSyslogMessage | null {
  const regex = /^<(\d+)>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\[.*?\])?\s*(.*)/s;
  const match = raw.match(regex);

  if (!match) return null;

  const [, priStr, version, timestampStr, hostname, appName, procId, msgId, structuredDataStr, message] = match;
  const { facility, severity, priority } = parsePriority(priStr);

  const timestamp = new Date(timestampStr);

  // Parse structured data
  let structuredData: Record<string, Record<string, string>> | undefined;
  if (structuredDataStr && structuredDataStr !== '-') {
    structuredData = parseStructuredData(structuredDataStr);
  }

  return {
    timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
    hostname,
    appName,
    procId: procId !== '-' ? procId : undefined,
    msgId: msgId !== '-' ? msgId : undefined,
    message: message.trim(),
    severity,
    facility,
    priority,
    version,
    structuredData,
    rawData: raw,
    sourceIp,
    isFortiGate: detectFortiGate(hostname, appName, message),
  };
}

/**
 * Parse RFC 5424 structured data: [id key="value"...]
 */
function parseStructuredData(str: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const sdRegex = /\[([^\s\]]+)((?:\s+\S+?="[^"]*")*)\]/g;
  let match;

  while ((match = sdRegex.exec(str)) !== null) {
    const sdId = match[1];
    const params: Record<string, string> = {};
    const paramRegex = /(\S+?)="([^"]*)"/g;
    let paramMatch;

    while ((paramMatch = paramRegex.exec(match[2])) !== null) {
      params[paramMatch[1]] = paramMatch[2];
    }

    result[sdId] = params;
  }

  return result;
}

/**
 * Parse CEF (Common Event Format) message
 * Format: CEF:Version|DeviceVendor|DeviceProduct|DeviceVersion|SignatureID|Name|Severity|Extensions
 */
export function parseCEF(message: string): CefData | null {
  const cefRegex = /^CEF:(\d+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|?(.*)$/;
  const match = message.match(cefRegex);

  if (!match) return null;

  const [, version, deviceVendor, deviceProduct, deviceVersion, signatureId, name, severity, extensionsStr] = match;

  const extensions: Record<string, string> = {};
  if (extensionsStr) {
    // Parse key=value pairs (space separated, values may contain spaces after =)
    const kvRegex = /(\w+)=(.*?)(?=\s+\w+=|$)/g;
    let kvMatch;

    while ((kvMatch = kvRegex.exec(extensionsStr)) !== null) {
      extensions[kvMatch[1]] = kvMatch[2].trim();
    }
  }

  return {
    version,
    deviceVendor,
    deviceProduct,
    deviceVersion,
    signatureId,
    name,
    severity,
    extensions
  };
}

/**
 * Detect if a message is from FortiGate
 */
function detectFortiGate(hostname: string, appName: string, message: string): boolean {
  const indicators = ['fortigate', 'fortinet', 'fgt', 'forti'];
  const lowerHostname = hostname.toLowerCase();
  const lowerAppName = appName.toLowerCase();
  const lowerMessage = message.toLowerCase();

  return indicators.some(i =>
    lowerHostname.includes(i) || lowerAppName.includes(i) || lowerMessage.includes(i)
  );
}

/**
 * Extract FortiGate-specific fields from message
 */
export function extractFortiGateFields(message: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Common FortiGate log fields: key=value
  const kvRegex = /(\w+)=(.*?)(?=\s+\w+=|\s*$)/g;
  let match;

  while ((match = kvRegex.exec(message)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].replace(/^"|"$/g, '').trim();
    if (value) {
      fields[key] = value;
    }
  }

  return fields;
}

/**
 * Main parse function - attempts to parse any syslog message
 */
export function parseSyslogMessage(raw: string, sourceIp?: string): ParsedSyslogMessage | null {
  if (!raw || raw.trim().length === 0) return null;

  const trimmed = raw.trim();

  // Try RFC 5424 first (starts with <PRI>VERSION)
  const rfc5424Result = parseRFC5424(trimmed, sourceIp);
  if (rfc5424Result?.version && parseInt(rfc5424Result.version) >= 1) {
    // Check for CEF in message body
    if (rfc5424Result.message.startsWith('CEF:')) {
      rfc5424Result.cefData = parseCEF(rfc5424Result.message);
    }
    return rfc5424Result;
  }

  // Try RFC 3164
  const rfc3164Result = parseRFC3164(trimmed, sourceIp);
  if (rfc3164Result) {
    // Check for CEF in message body
    if (rfc3164Result.message.startsWith('CEF:')) {
      rfc3164Result.cefData = parseCEF(rfc3164Result.message);
    }
    return rfc3164Result;
  }

  // Fallback: try to extract what we can
  const priMatch = trimmed.match(/^<(\d+)>/);
  if (priMatch) {
    const { facility, severity, priority } = parsePriority(priMatch[1]);
    return {
      timestamp: new Date(),
      hostname: sourceIp || 'unknown',
      appName: 'unknown',
      message: trimmed.replace(/^<\d+>/, '').trim(),
      severity,
      facility,
      priority,
      rawData: raw,
      sourceIp,
      isFortiGate: false,
    };
  }

  // Unable to parse
  return null;
}
