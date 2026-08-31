/**
 * Syslog UDP Server
 * Listens on UDP port 514 for syslog messages from network devices
 */

import dgram from 'dgram';
import { parseSyslogMessage, severityToEventLevel, extractFortiGateFields, type ParsedSyslogMessage } from './parser.js';
import { query } from '../database/index.js';

const DEFAULT_PORT = 514;
const DEFAULT_HOST = '0.0.0.0';

export interface SyslogServerConfig {
  enabled: boolean;
  port: number;
  host: string;
}

export class SyslogServer {
  private server: dgram.Socket | null = null;
  private config: SyslogServerConfig;
  private stats = {
    received: 0,
    parsed: 0,
    errors: 0,
    stored: 0,
    startTime: null as Date | null,
  };
  private messageHandlers: Array<(msg: ParsedSyslogMessage) => void> = [];

  constructor(config?: Partial<SyslogServerConfig>) {
    this.config = {
      enabled: config?.enabled ?? (process.env.SYSLOG_ENABLED === 'true'),
      port: config?.port ?? parseInt(process.env.SYSLOG_PORT || String(DEFAULT_PORT), 10),
      host: config?.host ?? (process.env.SYSLOG_HOST || DEFAULT_HOST),
    };
  }

  /**
   * Start the syslog UDP server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Syslog server disabled (SYSLOG_ENABLED=false)');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = dgram.createSocket('udp4');

      this.server.on('error', (err) => {
        console.error(`Syslog server error: ${err.message}`);
        if (err.message.includes('EACCES')) {
          console.error('Port 514 requires elevated privileges. Run with sudo or use a port > 1024');
        }
        reject(err);
      });

      this.server.on('message', async (msg, rinfo) => {
        await this.handleMessage(msg, rinfo);
      });

      this.server.on('listening', () => {
        const address = this.server!.address();
        this.stats.startTime = new Date();
        console.log(`Syslog server listening on ${address.address}:${address.port}/udp`);
        resolve();
      });

      this.server.bind(this.config.port, this.config.host);
    });
  }

  /**
   * Handle incoming syslog message
   */
  private async handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): Promise<void> {
    this.stats.received++;
    const raw = msg.toString('utf8').trim();
    const sourceIp = rinfo.address;

    try {
      const parsed = parseSyslogMessage(raw, sourceIp);

      if (!parsed) {
        this.stats.errors++;
        console.warn(`Failed to parse syslog message from ${sourceIp}: ${raw.substring(0, 100)}...`);
        return;
      }

      this.stats.parsed++;

      // Store to database
      await this.storeEvent(parsed);

      // Notify handlers
      for (const handler of this.messageHandlers) {
        try {
          handler(parsed);
        } catch (err) {
          console.error('Message handler error:', err);
        }
      }
    } catch (err) {
      this.stats.errors++;
      console.error('Error processing syslog message:', err);
    }
  }

  /**
   * Store parsed syslog event to database
   */
  private async storeEvent(msg: ParsedSyslogMessage): Promise<void> {
    try {
      const level = severityToEventLevel(msg.severity);
      const source = msg.isFortiGate
        ? `fortigate/${msg.appName}`
        : `${msg.hostname}/${msg.appName}`;

      // Build details object with all parsed data
      const details: Record<string, unknown> = {
        hostname: msg.hostname,
        appName: msg.appName,
        procId: msg.procId,
        msgId: msg.msgId,
        severity: msg.severity,
        facility: msg.facility,
        priority: msg.priority,
        sourceIp: msg.sourceIp,
      };

      // Add structured data if present
      if (msg.structuredData) {
        details.structuredData = msg.structuredData;
      }

      // Add CEF data if present
      if (msg.cefData) {
        details.cef = msg.cefData;
        // Override severity with CEF severity if available
        details.cefSeverity = msg.cefData.severity;
      }

      // Add FortiGate-specific fields
      if (msg.isFortiGate) {
        const fgFields = extractFortiGateFields(msg.message);
        if (Object.keys(fgFields).length > 0) {
          details.fortigateFields = fgFields;

          // Extract common FortiGate fields for easier querying
          if (fgFields.srcip) details.srcip = fgFields.srcip;
          if (fgFields.dstip) details.dstip = fgFields.dstip;
          if (fgFields.srcport) details.srcport = fgFields.srcport;
          if (fgFields.dstport) details.dstport = fgFields.dstport;
          if (fgFields.proto) details.proto = fgFields.proto;
          if (fgFields.action) details.action = fgFields.action;
          if (fgFields.policyid) details.policyId = fgFields.policyid;
          if (fgFields.devname) details.deviceName = fgFields.devname;
        }
      }

      await query(
        'INSERT INTO events (level, source, message, details) VALUES ($1, $2, $3, $4)',
        [level, source, msg.message, JSON.stringify(details)]
      );

      this.stats.stored++;
    } catch (err) {
      console.error('Error storing syslog event:', err);
    }
  }

  /**
   * Register a handler for incoming parsed messages
   */
  onMessage(handler: (msg: ParsedSyslogMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.stats.startTime
        ? Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)
        : 0,
      enabled: this.config.enabled,
      port: this.config.port,
    };
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null && this.config.enabled;
  }

  /**
   * Stop the syslog server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('Syslog server stopped');
          this.server = null;
          resolve();
        });
      });
    }
  }
}

// Singleton instance
let syslogServer: SyslogServer | null = null;

/**
 * Get or create the singleton SyslogServer instance
 */
export function getSyslogServer(): SyslogServer {
  if (!syslogServer) {
    syslogServer = new SyslogServer();
  }
  return syslogServer;
}

/**
 * Start the syslog server with configuration from environment
 */
export async function startSyslogServer(): Promise<void> {
  const server = getSyslogServer();

  // Register default event logging
  server.onMessage((msg) => {
    if (msg.severity === 'emerg' || msg.severity === 'alert' || msg.severity === 'crit') {
      console.error(`[CRITICAL SYSLOG] ${msg.hostname}/${msg.appName}: ${msg.message}`);
    }
  });

  await server.start();
}

/**
 * Stop the syslog server
 */
export async function stopSyslogServer(): Promise<void> {
  if (syslogServer) {
    await syslogServer.stop();
  }
}
