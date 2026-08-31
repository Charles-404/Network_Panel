import snmp from 'net-snmp';
import { query } from '../database/index.js';
import { settingsService } from '../settings/service.js';

// ============================================================================
// SNMP Configuration
// ============================================================================

interface SnmpConfig {
  host: string;
  community: string;
  port: number;
  timeout: number;
  retries: number;
  version?: string;
  username?: string;
  authProtocol?: string;
  authPassword?: string;
  privProtocol?: string;
  privPassword?: string;
}

interface SnmpTarget {
  id: string;
  name: string;
  host: string;
  port: number;
  community?: string;
  version: '1' | '2c' | '3';
  enabled: boolean;
  username?: string;
  authProtocol?: string;
  authPassword?: string;
  privProtocol?: string;
  privPassword?: string;
  securityLevel?: string;
  interval?: number;
  retries?: number;
  timeout?: number;
}

async function getSnmpConfig(): Promise<SnmpConfig> {
  try {
    // Try to read from database settings first
    const systemSettings = await settingsService.getSystemSettings();
    const snmpSettings = systemSettings.snmp as Record<string, unknown>;
    
    if (snmpSettings?.enabled && snmpSettings?.host) {
      return {
        host: snmpSettings.host as string,
        community: (snmpSettings.community as string) || 'public',
        port: (snmpSettings.port as number) || 161,
        timeout: (snmpSettings.interval as number) || 5000,
        retries: (snmpSettings.retries as number) || 1,
      };
    }
  } catch (error) {
    console.warn('Failed to read SNMP config from database, using environment variables');
  }
  
  // Fallback to environment variables
  return {
    host: process.env.SNMP_HOST || '192.168.1.1',
    community: process.env.SNMP_COMMUNITY || 'public',
    port: parseInt(process.env.SNMP_PORT || '161'),
    timeout: parseInt(process.env.SNMP_TIMEOUT || '5000'),
    retries: parseInt(process.env.SNMP_RETRIES || '1'),
    version: process.env.SNMP_VERSION || '2c',
    username: process.env.SNMP_USERNAME,
    securityLevel: process.env.SNMP_SECURITY_LEVEL || 'noAuthNoPriv',
    authProtocol: process.env.SNMP_AUTH_PROTOCOL,
    authPassword: process.env.SNMP_AUTH_PASSWORD,
    privProtocol: process.env.SNMP_PRIV_PROTOCOL,
    privPassword: process.env.SNMP_PRIV_PASSWORD,
  };
}

export async function isSnmpConfigured(): Promise<boolean> {
  try {
    const systemSettings = await settingsService.getSystemSettings();
    const snmpSettings = systemSettings.snmp as Record<string, unknown>;
    
    if (snmpSettings?.enabled && snmpSettings?.host) {
      return true;
    }
  } catch (error) {
    // Ignore error and check env vars
  }
  
  // Fallback to environment variables
  const host = process.env.SNMP_HOST;
  return !!host && host.length > 0;
}

// ============================================================================
// SNMP OIDs (MIB-II)
// ============================================================================

// System MIB
const OIDs = {
  // System group
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysObjectID: '1.3.6.1.2.1.1.2.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysContact: '1.3.6.1.2.1.1.4.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',

  // Interface group (ifTable)
  ifNumber: '1.3.6.1.2.1.2.1.0',
  ifIndex: '1.3.6.1.2.1.2.2.1.1',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
  ifType: '1.3.6.1.2.1.2.2.1.3',
  ifSpeed: '1.3.6.1.2.1.2.2.1.5',
  ifPhysAddress: '1.3.6.1.2.1.2.2.1.6',
  ifAdminStatus: '1.3.6.1.2.1.2.2.1.7',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifInUcastPkts: '1.3.6.1.2.1.2.2.1.11',
  ifInDiscards: '1.3.6.1.2.1.2.2.1.13',
  ifInErrors: '1.3.6.1.2.1.2.2.1.14',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
  ifOutUcastPkts: '1.3.6.1.2.1.2.2.1.17',
  ifOutDiscards: '1.3.6.1.2.1.2.2.1.19',
  ifOutErrors: '1.3.6.1.2.1.2.2.1.20',

  // Host Resources MIB (CPU/Memory - if supported)
  hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2',
  hrStorageDescr: '1.3.6.1.2.1.25.2.3.1.3',
  hrStorageSize: '1.3.6.1.2.1.25.2.3.1.5',
  hrStorageUsed: '1.3.6.1.2.1.25.2.3.1.6',
  hrStorageAllocationUnits: '1.3.6.1.2.1.25.2.3.1.4',
};

// ============================================================================
// SNMP Session Helper
// ============================================================================

class SnmpSession {
  private session: snmp.Session;
  private config: SnmpConfig;

  constructor(config: SnmpConfig) {
    this.config = config;
    
    const options: any = {
      port: config.port,
      timeout: config.timeout / 1000, // net-snmp uses seconds
      retries: config.retries,
    };

    // Handle SNMPv3
    if (config.version === '3' && config.username) {
      options.version = snmp.SnmpVersion.v3;
      
      // Map security level string to enum
      let securityLevel = snmp.SecurityLevel.noAuthNoPriv;
      if (config.securityLevel === 'authPriv' || config.securityLevel === '3') {
        securityLevel = snmp.SecurityLevel.authPriv;
      } else if (config.securityLevel === 'authNoPriv' || config.securityLevel === '2') {
        securityLevel = snmp.SecurityLevel.authNoPriv;
      } else if (config.securityLevel === 'noAuthNoPriv' || config.securityLevel === '1') {
        securityLevel = snmp.SecurityLevel.noAuthNoPriv;
      }
      
      options.security = {
        username: config.username,
        level: securityLevel,
      };
      
      if (config.authPassword && config.authProtocol) {
        options.security.authProtocol = config.authProtocol;
        options.security.authPassword = config.authPassword;
      }
      
      if (config.privPassword && config.privProtocol) {
        options.security.privProtocol = config.privProtocol;
        options.security.privPassword = config.privPassword;
      }
    }

    this.session = snmp.createSession(config.host, config.community || 'public', options);
  }

  // Get single OID value
  async get(oid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.session.get([oid], (error: any, varbinds: any[]) => {
        if (error) {
          reject(error);
        } else if (snmp.isVarbindError(varbinds[0])) {
          reject(new Error(snmp.varbindError(varbinds[0])));
        } else {
          resolve(varbinds[0]?.value);
        }
      });
    });
  }

  // Get multiple OID values
  async getAll(oids: string[]): Promise<Map<string, any>> {
    return new Promise((resolve, reject) => {
      this.session.get(oids, (error: any, varbinds: any[]) => {
        if (error) {
          reject(error);
        } else {
          const results = new Map<string, any>();
          for (let i = 0; i < varbinds.length; i++) {
            if (!snmp.isVarbindError(varbinds[i])) {
              results.set(oids[i], varbinds[i].value);
            }
          }
          resolve(results);
        }
      });
    });
  }

  // Walk an OID tree (for tables)
  async walk(oid: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      this.session.walk(oid, (error: any, varbinds: any[]) => {
        if (error) {
          reject(error);
        } else {
          for (const vb of varbinds) {
            if (!snmp.isVarbindError(vb)) {
              results.push({
                oid: vb.oid,
                value: vb.value,
                type: vb.type,
              });
            }
          }
          return results; // Continue walking
        }
      }, () => {
        resolve(results);
      });
    });
  }

  close(): void {
    this.session.close();
  }
}

// ============================================================================
// Data Collection Logic
// ============================================================================

let collectionInterval: NodeJS.Timeout | null = null;
let prevInterfaceStats: Map<number, { inOctets: number; outOctets: number; timestamp: number }> = new Map();

interface InterfaceData {
  index: number;
  descr: string;
  type: number;
  speed: number;
  mac: string;
  adminStatus: number;
  operStatus: number;
  inOctets: number;
  outOctets: number;
  inUcastPkts: number;
  outUcastPkts: number;
  inErrors: number;
  outErrors: number;
  inDiscards: number;
  outDiscards: number;
}

async function collectInterfaceData(session: SnmpSession): Promise<InterfaceData[]> {
  const interfaces: InterfaceData[] = [];

  try {
    // Get interface count
    const ifNumber = await session.get(OIDs.ifNumber) as number;
    if (!ifNumber || ifNumber === 0) return interfaces;

    // Walk interface table
    const [indexes, descrs, speeds, macs, adminStatuses, operStatuses,
      inOctetsList, outOctetsList, inUcastPktsList, outUcastPktsList,
      inErrorsList, outErrorsList, inDiscardsList, outDiscardsList] = await Promise.all([
      session.walk(OIDs.ifIndex),
      session.walk(OIDs.ifDescr),
      session.walk(OIDs.ifSpeed),
      session.walk(OIDs.ifPhysAddress),
      session.walk(OIDs.ifAdminStatus),
      session.walk(OIDs.ifOperStatus),
      session.walk(OIDs.ifInOctets),
      session.walk(OIDs.ifOutOctets),
      session.walk(OIDs.ifInUcastPkts),
      session.walk(OIDs.ifOutUcastPkts),
      session.walk(OIDs.ifInErrors),
      session.walk(OIDs.ifOutErrors),
      session.walk(OIDs.ifInDiscards),
      session.walk(OIDs.ifOutDiscards),
    ]);

    // Build interface map
    for (let i = 0; i < indexes.length; i++) {
      const idx = i + 1; // SNMP indexes are 1-based
      interfaces.push({
        index: idx,
        descr: descrs[i]?.value?.toString() || `eth${i}`,
        type: 0,
        speed: speeds[i]?.value as number || 0,
        mac: formatMac(macs[i]?.value as Buffer),
        adminStatus: adminStatuses[i]?.value as number || 0,
        operStatus: operStatuses[i]?.value as number || 0,
        inOctets: inOctetsList[i]?.value as number || 0,
        outOctets: outOctetsList[i]?.value as number || 0,
        inUcastPkts: inUcastPktsList[i]?.value as number || 0,
        outUcastPkts: outUcastPktsList[i]?.value as number || 0,
        inErrors: inErrorsList[i]?.value as number || 0,
        outErrors: outErrorsList[i]?.value as number || 0,
        inDiscards: inDiscardsList[i]?.value as number || 0,
        outDiscards: outDiscardsList[i]?.value as number || 0,
      });
    }
  } catch (err) {
    console.error('Failed to collect interface data:', err);
  }

  return interfaces;
}

async function collectSystemInfo(session: SnmpSession): Promise<{
  sysDescr: string;
  sysName: string;
  sysUpTime: number;
  sysLocation: string;
}> {
  try {
    const results = await session.getAll([
      OIDs.sysDescr,
      OIDs.sysName,
      OIDs.sysUpTime,
      OIDs.sysLocation,
    ]);
    return {
      sysDescr: results.get(OIDs.sysDescr)?.toString() || '',
      sysName: results.get(OIDs.sysName)?.toString() || '',
      sysUpTime: results.get(OIDs.sysUpTime) as number || 0,
      sysLocation: results.get(OIDs.sysLocation)?.toString() || '',
    };
  } catch {
    return { sysDescr: '', sysName: '', sysUpTime: 0, sysLocation: '' };
  }
}

async function collectCpuMemory(session: SnmpSession): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
}> {
  let cpuUsage = 0;
  let memoryUsage = 0;
  let memoryTotal = 0;
  let memoryUsed = 0;

  try {
    // Try Host Resources MIB for CPU
    const cpuResults = await session.walk(OIDs.hrProcessorLoad);
    if (cpuResults.length > 0) {
      // Average CPU load across all processors
      const loads = cpuResults.map(r => r.value as number).filter(v => v >= 0 && v <= 100);
      if (loads.length > 0) {
        cpuUsage = Math.round(loads.reduce((a, b) => a + b, 0) / loads.length * 100) / 100;
      }
    }
  } catch {
    // CPU info not available
  }

  try {
    // Try Host Resources MIB for Memory (Physical memory = type 2)
    const [storageDescrs, storageSizes, storageUsed, storageUnits] = await Promise.all([
      session.walk(OIDs.hrStorageDescr),
      session.walk(OIDs.hrStorageSize),
      session.walk(OIDs.hrStorageUsed),
      session.walk(OIDs.hrStorageAllocationUnits),
    ]);

    // Find physical memory storage (index 1 or contains "Physical" / "RAM")
    for (let i = 0; i < storageDescrs.length; i++) {
      const descr = storageDescrs[i]?.value?.toString().toLowerCase() || '';
      if (descr.includes('physical') || descr.includes('ram') || descr.includes('memory') || i === 0) {
        const units = storageUnits[i]?.value as number || 1;
        const size = (storageSizes[i]?.value as number || 0) * units;
        const used = (storageUsed[i]?.value as number || 0) * units;
        if (size > 0) {
          // Convert to KB (SNMP typically reports in bytes or allocation units)
          memoryTotal = Math.floor(size / 1024);
          memoryUsed = Math.floor(used / 1024);
          memoryUsage = Math.round((used / size) * 10000) / 100;
          break;
        }
      }
    }
  } catch {
    // Memory info not available
  }

  return { cpuUsage, memoryUsage, memoryTotal, memoryUsed };
}

// ============================================================================
// Main Collection Function
// ============================================================================

export async function collectSnmpData(): Promise<void> {
  const config = getSnmpConfig();
  const session = new SnmpSession(config);

  try {
    console.log(`Collecting SNMP data from ${config.host}...`);

    // Collect all data in parallel
    const [systemInfo, interfaces, cpuMemory] = await Promise.all([
      collectSystemInfo(session),
      collectInterfaceData(session),
      collectCpuMemory(session),
    ]);

    const now = Date.now();

    // Insert system_status
    await query(
      `INSERT INTO system_status (
        cpu_usage, memory_usage, memory_total, memory_used,
        temperature, session_count, session_rate, packet_rate,
        firmware_version, uptime_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        cpuMemory.cpuUsage,
        cpuMemory.memoryUsage,
        cpuMemory.memoryTotal,
        cpuMemory.memoryUsed,
        0, // temperature (not available via standard MIB-II)
        0, // session_count
        0, // session_rate
        0, // packet_rate
        systemInfo.sysDescr.substring(0, 50),
        Math.floor(systemInfo.sysUpTime / 100), // Convert timeticks to seconds
      ]
    );

    // Insert interface traffic stats with speed calculation
    for (const iface of interfaces) {
      // Calculate speed from delta
      let rxSpeed = 0;
      let txSpeed = 0;
      const prev = prevInterfaceStats.get(iface.index);

      if (prev && (now - prev.timestamp) > 0) {
        const elapsedSec = (now - prev.timestamp) / 1000;
        // Handle counter wrap (32-bit counters)
        const inDelta = iface.inOctets >= prev.inOctets
          ? iface.inOctets - prev.inOctets
          : (0xFFFFFFFF - prev.inOctets) + iface.inOctets;
        const outDelta = iface.outOctets >= prev.outOctets
          ? iface.outOctets - prev.outOctets
          : (0xFFFFFFFF - prev.outOctets) + iface.outOctets;

        rxSpeed = Math.max(0, Math.floor(inDelta / elapsedSec));
        txSpeed = Math.max(0, Math.floor(outDelta / elapsedSec));
      }

      // Update previous stats
      prevInterfaceStats.set(iface.index, {
        inOctets: iface.inOctets,
        outOctets: iface.outOctets,
        timestamp: now,
      });

      // Store traffic stats (using speed, not cumulative bytes)
      await query(
        `INSERT INTO traffic_stats (interface_name, rx_bytes, tx_bytes, rx_packets, tx_packets)
         VALUES ($1, $2, $3, $4, $5)`,
        [iface.descr, rxSpeed, txSpeed, iface.inUcastPkts, iface.outUcastPkts]
      );

      // Store interface as device
      if (iface.operStatus === 1) { // 1 = up
        await query(
          `INSERT INTO devices (id, name, type, ip_address, mac_address, interface_name, is_online)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             mac_address = $5,
             is_online = $7,
             last_seen = NOW()`,
          [
            `snmp-if-${iface.index}`,
            iface.descr,
            'router',
            '', // IP not available from ifTable alone
            iface.mac,
            iface.descr,
            iface.operStatus === 1,
          ]
        );
      }
    }

    // Insert history metrics for charts
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1, $2)', ['cpu', cpuMemory.cpuUsage]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1, $2)', ['memory', cpuMemory.memoryUsage]);

    // Calculate total traffic for all interfaces
    let totalRxSpeed = 0;
    let totalTxSpeed = 0;
    for (const iface of interfaces) {
      const prev = prevInterfaceStats.get(iface.index);
      if (prev) {
        const elapsedSec = (now - prev.timestamp) / 1000;
        if (elapsedSec > 0) {
          const inDelta = iface.inOctets >= prev.inOctets
            ? iface.inOctets - prev.inOctets
            : (0xFFFFFFFF - prev.inOctets) + iface.inOctets;
          const outDelta = iface.outOctets >= prev.outOctets
            ? iface.outOctets - prev.outOctets
            : (0xFFFFFFFF - prev.outOctets) + iface.outOctets;
          totalRxSpeed += Math.max(0, inDelta / elapsedSec);
          totalTxSpeed += Math.max(0, outDelta / elapsedSec);
        }
      }
    }

    const rxMbps = (totalRxSpeed * 8 / 1000000).toFixed(2);
    const txMbps = (totalTxSpeed * 8 / 1000000).toFixed(2);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1, $2)', ['traffic_in', parseFloat(rxMbps)]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1, $2)', ['traffic_out', parseFloat(txMbps)]);

    // Log event
    await query(
      'INSERT INTO events (level, source, message) VALUES ($1, $2, $3)',
      [
        'info',
        'snmp',
        `SNMP采集完成 - CPU:${cpuMemory.cpuUsage}% 内存:${cpuMemory.memoryUsage}% 接口:${interfaces.length} 下行:${rxMbps}Mbps 上行:${txMbps}Mbps`,
      ]
    );

    console.log(`SNMP collected: CPU=${cpuMemory.cpuUsage}% Mem=${cpuMemory.memoryUsage}% Interfaces=${interfaces.length} RX=${rxMbps}Mbps TX=${txMbps}Mbps`);
  } catch (error: any) {
    console.error('SNMP collection failed:', error.message);
    await query(
      'INSERT INTO events (level, source, message) VALUES ($1, $2, $3)',
      ['error', 'snmp', `SNMP采集失败: ${error.message}`]
    );
  } finally {
    session.close();
  }
}

// ============================================================================
// Start/Stop Functions
// ============================================================================

// Collection intervals for multiple targets
const targetIntervals: Map<string, NodeJS.Timeout> = new Map();

export async function startSnmpCollector(intervalMs: number = 30000): Promise<void> {
  const targets = await getSnmpTargets();
  
  if (targets.length === 0) {
    // Fallback to single target mode
    const config = await getSnmpConfig();
    console.log(`Starting SNMP collector for ${config.host} (interval: ${intervalMs}ms)`);
    await collectSnmpData();
    collectionInterval = setInterval(collectSnmpData, intervalMs);
    return;
  }
  
  // Start collectors for each target
  for (const target of targets) {
    if (!target.enabled) continue;
    
    console.log(`Starting SNMP collector for ${target.name} (${target.host}) (interval: ${target.interval || intervalMs}ms)`);
    
    // Initial collection for this target
    await collectSnmpDataForTarget(target);
    
    // Periodic collection for this target
    const interval = setInterval(() => collectSnmpDataForTarget(target), target.interval || intervalMs);
    targetIntervals.set(target.id, interval);
  }

  // Initial collection
  collectSnmpData();

  // Periodic collection
  collectionInterval = setInterval(collectSnmpData, intervalMs);
}

export function stopSnmpCollector(): void {
  if (collectionInterval) {
    clearInterval(collectionInterval);
    collectionInterval = null;
  }
  
  // Stop all target-specific intervals
  for (const [targetId, interval] of targetIntervals) {
    clearInterval(interval);
  }
  targetIntervals.clear();
  
  console.log('SNMP collector stopped');
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatMac(buffer: Buffer | null | undefined): string {
  if (!buffer || buffer.length !== 6) return '';
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
}

// ============================================================================
// Exports for testing
// ============================================================================

export { SnmpSession, OIDs, getSnmpConfig, getSnmpTargets, getSnmpTargetById };
