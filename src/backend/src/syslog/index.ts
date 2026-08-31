export { SyslogServer, getSyslogServer, startSyslogServer, stopSyslogServer } from './server.js';
export { parseSyslogMessage, parseCEF, extractFortiGateFields, severityToEventLevel } from './parser.js';
export type { ParsedSyslogMessage, CefData, SyslogSeverity, SyslogFacility } from './parser.js';
