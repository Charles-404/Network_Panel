import { execSync } from 'child_process';
import { query } from '../database/index.js';

// ============================================================================
// SNMP CLI Collector - Uses snmpwalk command for reliable SNMPv3 support
// ============================================================================

interface SnmpConfig {
  host: string;
  port: number;
  version: string;
  username?: string;
  securityLevel?: string;
  authProtocol?: string;
  authPassword?: string;
  privProtocol?: string;
  privPassword?: string;
  interval?: number;
  retries?: number;
  timeout?: number;
}

let collectionInterval: NodeJS.Timeout | null = null;
let prevWanRx = 0;
let prevWanTx = 0;
let prevTimestamp = 0;

async function getSnmpConfig(): Promise<SnmpConfig> {
  // Read from environment variables
  return {
    host: process.env.SNMP_HOST || '10.1.1.1',
    port: parseInt(process.env.SNMP_PORT || '161'),
    version: process.env.SNMP_VERSION || '3',
    username: process.env.SNMP_USERNAME || 'SNMP_User',
    securityLevel: process.env.SNMP_SECURITY_LEVEL || 'noAuthNoPriv',
    interval: parseInt(process.env.SNMP_INTERVAL || '30000'),
    retries: parseInt(process.env.SNMP_RETRIES || '1'),
    timeout: parseInt(process.env.SNMP_TIMEOUT || '5000'),
  };
}

function buildSnmpCommand(oid: string, config: SnmpConfig): string {
  const timeoutSec = Math.ceil((config.timeout || 5000) / 1000);
  
  if (config.version === '3') {
    let cmd = `snmpwalk -v3 -l ${config.securityLevel || 'noAuthNoPriv'} -u ${config.username} -t ${timeoutSec} ${config.host}:${config.port} ${oid}`;
    
    if (config.authProtocol && config.authPassword) {
      cmd = `snmpwalk -v3 -l ${config.securityLevel || 'authPriv'} -u ${config.username} -a ${config.authProtocol} -A ${config.authPassword} -t ${timeoutSec} ${config.host}:${config.port} ${oid}`;
      
      if (config.privProtocol && config.privPassword) {
        cmd += ` -x ${config.privProtocol} -X ${config.privPassword}`;
      }
    }
    
    return cmd;
  } else {
    // v1/v2c
    return `snmpwalk -v${config.version} -c public -t ${timeoutSec} ${config.host}:${config.port} ${oid}`;
  }
}

function executeSnmpWalk(oid: string, config: SnmpConfig): string {
  try {
    const cmd = buildSnmpCommand(oid, config);
    console.log(`[SNMP CLI] Executing: ${cmd}`);
    const output = execSync(cmd, { 
      timeout: (config.timeout || 5000) + 2000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output;
  } catch (error: any) {
    console.error(`[SNMP CLI] Command failed:`, error.message);
    return '';
  }
}

function parseSnmpOutput(output: string): Map<string, string> {
  const results = new Map<string, string>();
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Parse output like: DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (96773825) 11 days, 4:48:58.25
    // Or: SNMPv2-MIB::sysDescr.0 = STRING: FG-30E-Chengdu
    const match = line.match(/^(\S+)\s*=\s*(.+)$/);
    if (match) {
      const oid = match[1];
      const value = match[2].trim();
      results.set(oid, value);
    }
  }
  
  return results;
}

function extractNumericValue(value: string): number {
  // Extract numeric value from various formats
  // Timeticks: (96773825) 11 days, 4:48:58.25 -> 96773825
  // INTEGER: 3 -> 3
  // Gauge32: 1234 -> 1234
  // Counter64: 12345 -> 12345
  
  const timetickMatch = value.match(/\((\d+)\)/);
  if (timetickMatch) return parseInt(timetickMatch[1]);
  
  const intMatch = value.match(/INTEGER:\s*(\d+)/i);
  if (intMatch) return parseInt(intMatch[1]);
  
  const gaugeMatch = value.match(/Gauge32:\s*(\d+)/i);
  if (gaugeMatch) return parseInt(gaugeMatch[1]);
  
  const counterMatch = value.match(/Counter\d+:\s*(\d+)/i);
  if (counterMatch) return parseInt(counterMatch[1]);
  
  // Handle STRING format (e.g., "v6.2.16,build1392,240129 (GA)")
  // Don't extract numbers from strings
  if (value.includes('STRING:')) return 0;
  
  // Try to extract just the number (last resort)
  const numMatch = value.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1]);
  
  return 0;
}

// ============================================================================
// SNMP OIDs for FortiGate
// ============================================================================

const OIDs = {
  // System MIB
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',
  
  // CPU/Memory (FortiGate specific)
  fgSysCpuUsage: '1.3.6.1.4.1.12356.101.4.1.3.0',
  fgSysMemUsage: '1.3.6.1.4.1.12356.101.4.1.4.0',
  fgSysMemTotal: '1.3.6.1.4.1.12356.101.4.1.5.0',
  fgSysDiskUsage: '1.3.6.1.4.1.12356.101.4.1.7.0',
  fgSysSesCount: '1.3.6.1.4.1.12356.101.4.1.8.0',
  
  // Network interfaces
  ifTable: '1.3.6.1.2.1.2.2',
  ifNumber: '1.3.6.1.2.1.2.1.0',
  ifName: '1.3.6.1.2.1.31.1.1.1.1',
  ifHCInOctets: '1.3.6.1.2.1.31.1.1.1.6',
  ifHCOutOctets: '1.3.6.1.2.1.31.1.1.1.10',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
};

export async function startSnmpCliCollector(intervalMs?: number): Promise<void> {
  const config = await getSnmpConfig();
  const interval = intervalMs || config.interval || 30000;
  
  console.log(`[SNMP CLI] Starting collector for ${config.host} (interval: ${interval}ms)`);
  
  // Initial collection
  await collectSnmpCliData(config);
  
  // Periodic collection
  collectionInterval = setInterval(() => collectSnmpCliData(config), interval);
}

export function stopSnmpCliCollector(): void {
  if (collectionInterval) {
    clearInterval(collectionInterval);
    collectionInterval = null;
  }
  console.log('[SNMP CLI] Collector stopped');
}

export async function isSnmpCliConfigured(): Promise<boolean> {
  return !!(process.env.SNMP_HOST && process.env.SNMP_USERNAME);
}

async function collectSnmpCliData(config: SnmpConfig): Promise<void> {
  try {
    const startTime = Date.now();
    console.log('[SNMP CLI] Collecting data... (timestamp:', startTime, ')');
    
    // Get system info
    const sysUpTimeOutput = executeSnmpWalk(OIDs.sysUpTime, config);
    const sysResults = parseSnmpOutput(sysUpTimeOutput);
    
    let uptime = 0;
    for (const [key, value] of sysResults) {
      if (key.endsWith('.1.3.0') || key.includes('sysUpTime')) {
        uptime = extractNumericValue(value);
        console.log(`[SNMP CLI] sysUpTime: ${uptime}`);
      }
    }
    
    // Get CPU usage (FortiGate specific: .1.3.6.1.4.1.12356.101.4.1.3.0)
    const cpuOutput = executeSnmpWalk(OIDs.fgSysCpuUsage, config);
    const cpuResults = parseSnmpOutput(cpuOutput);
    let cpuUsage = 0;
    for (const [key, value] of cpuResults) {
      // Match OID pattern like: SNMPv2-SMI::enterprises.12356.101.4.1.3.0 = Gauge32: 0
      if (key.endsWith('.1.3.0') || key.includes('1.3.6.1.4.1.12356.101.4.1.3') || key.includes('fgSysCpuUsage')) {
        cpuUsage = extractNumericValue(value);
        console.log(`[SNMP CLI] CPU Usage: ${cpuUsage}%`);
        break;
      }
    }
    
    // Get Memory usage (FortiGate specific: .1.3.6.1.4.1.12356.101.4.1.4.0)
    const memOutput = executeSnmpWalk(OIDs.fgSysMemUsage, config);
    const memResults = parseSnmpOutput(memOutput);
    let memUsage = 0;
    for (const [key, value] of memResults) {
      // Match OID pattern like: SNMPv2-SMI::enterprises.12356.101.4.1.4.0 = Gauge32: 42
      if (key.endsWith('.1.4.0') || key.includes('1.3.6.1.4.1.12356.101.4.1.4') || key.includes('fgSysMemUsage')) {
        memUsage = extractNumericValue(value);
        console.log(`[SNMP CLI] Memory Usage: ${memUsage}%`);
        break;
      }
    }
    
    // Get Memory Total (FortiGate specific: .1.3.6.1.4.1.12356.101.4.1.5.0)
    const memTotalOutput = executeSnmpWalk(OIDs.fgSysMemTotal, config);
    const memTotalResults = parseSnmpOutput(memTotalOutput);
    let memTotal = 0;
    for (const [key, value] of memTotalResults) {
      if (key.endsWith('.1.5.0') || key.includes('1.3.6.1.4.1.12356.101.4.1.5') || key.includes('fgSysMemTotal')) {
        memTotal = extractNumericValue(value);
        console.log(`[SNMP CLI] Memory Total: ${memTotal} KB`);
        break;
      }
    }
    
    // Get Session count (FortiGate specific: .1.3.6.1.4.1.12356.101.4.1.8.0)
    const sesOutput = executeSnmpWalk(OIDs.fgSysSesCount, config);
    const sesResults = parseSnmpOutput(sesOutput);
    let sessionCount = 0;
    for (const [key, value] of sesResults) {
      // Match OID pattern like: SNMPv2-SMI::enterprises.12356.101.4.1.8.0 = Gauge32: 497
      if (key.endsWith('.1.8.0') || key.includes('1.3.6.1.4.1.12356.101.4.1.8') || key.includes('fgSysSesCount')) {
        sessionCount = extractNumericValue(value);
        console.log(`[SNMP CLI] Session Count: ${sessionCount}`);
        break;
      }
    }
    
    // Get Session Rate (FortiGate specific: .1.3.6.1.4.1.12356.101.4.1.9.0)
    const sesRateOutput = executeSnmpWalk('1.3.6.1.4.1.12356.101.4.1.9.0', config);
    const sesRateResults = parseSnmpOutput(sesRateOutput);
    let sessionRate = 0;
    for (const [key, value] of sesRateResults) {
      if (key.endsWith('.1.9.0') || key.includes('1.3.6.1.4.1.12356.101.4.1.9')) {
        sessionRate = extractNumericValue(value);
        console.log(`[SNMP CLI] Session Rate: ${sessionRate}`);
        break;
      }
    }
    
    // Get interface traffic (using ifHCInOctets/ifHCOutOctets for 64-bit counters)
    let wanRx = 0;
    let wanTx = 0;
    
    // Walk interface names to find WAN
    const ifNameOutput = executeSnmpWalk(OIDs.ifName, config);
    const ifNameResults = parseSnmpOutput(ifNameOutput);
    
    // Find WAN interface index
    let wanIndex = -1;
    for (const [key, value] of ifNameResults) {
      if (value.toLowerCase().includes('wan') || value.includes('1')) {
        const indexMatch = key.match(/\.(\d+)$/);
        if (indexMatch) {
          wanIndex = parseInt(indexMatch[1]);
          console.log(`[SNMP CLI] WAN interface found at index: ${wanIndex}`);
          break;
        }
      }
    }
    
    if (wanIndex > 0) {
      // Get RX bytes
      const rxOutput = executeSnmpWalk(`${OIDs.ifHCInOctets}.${wanIndex}`, config);
      const rxResults = parseSnmpOutput(rxOutput);
      for (const [key, value] of rxResults) {
        wanRx = extractNumericValue(value);
        console.log(`[SNMP CLI] WAN RX: ${wanRx} bytes`);
      }
      
      // Get TX bytes
      const txOutput = executeSnmpWalk(`${OIDs.ifHCOutOctets}.${wanIndex}`, config);
      const txResults = parseSnmpOutput(txOutput);
      for (const [key, value] of txResults) {
        wanTx = extractNumericValue(value);
        console.log(`[SNMP CLI] WAN TX: ${wanTx} bytes`);
      }
    }
    
    // Calculate speed (bytes/sec)
    const now = Date.now();
    let rxSpeed = 0;
    let txSpeed = 0;
    
    if (prevTimestamp > 0 && (now - prevTimestamp) > 0) {
      const elapsedSec = (now - prevTimestamp) / 1000;
      rxSpeed = Math.max(0, Math.floor((wanRx - prevWanRx) / elapsedSec));
      txSpeed = Math.max(0, Math.floor((wanTx - prevWanTx) / elapsedSec));
    }
    
    prevWanRx = wanRx;
    prevWanTx = wanTx;
    prevTimestamp = now;
    
    // Convert to Mbps
    const rxMbps = (rxSpeed * 8 / 1000000).toFixed(2);
    const txMbps = (txSpeed * 8 / 1000000).toFixed(2);
    
    const elapsed = Date.now() - startTime;
    console.log(`[SNMP CLI] Collected (${elapsed}ms): CPU=${cpuUsage}% Mem=${memUsage}% Sessions=${sessionCount} RX=${rxMbps}Mbps TX=${txMbps}Mbps`);
    
    // Store in database
    await query(
      'INSERT INTO system_status (cpu_usage, memory_usage, memory_total, memory_used, temperature, session_count, session_rate, uptime_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [cpuUsage, memUsage, memTotal, Math.floor(memTotal * memUsage / 100), 0, sessionCount, sessionRate, Math.floor(uptime / 100)]
    );
    
    await query(
      'INSERT INTO traffic_stats (interface_name, rx_bytes, tx_bytes) VALUES ($1,$2,$3)',
      ['wan1', rxSpeed, txSpeed]
    );
    
    // Store history metrics
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['cpu', cpuUsage]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['memory', memUsage]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['sessions', sessionCount]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['traffic_in', parseFloat(rxMbps)]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['traffic_out', parseFloat(txMbps)]);
    
    // Update device online status (mark all SNMP-discovered devices as online)
    try {
      await query(
        'UPDATE devices SET is_online = true, last_seen = NOW() WHERE type IN ($1, $2)',
        ['router', 'switch']
      );
      // Also update interface devices
      await query(
        'UPDATE devices SET is_online = true, last_seen = NOW() WHERE id LIKE $1',
        ['iface-%']
      );
    } catch (e) {
      console.error('[SNMP CLI] Failed to update device status:', e);
    }
    
    // Broadcast to WebSocket clients
    try {
      const { broadcastToClients } = await import('../websocket/index.js');
      broadcastToClients({
        type: 'system_status',
        data: {
          cpu_usage: cpuUsage,
          memory_usage: memUsage,
          memory_total: memTotal,
          session_count: sessionCount,
          session_rate: sessionRate,
          uptime_seconds: Math.floor(uptime / 100),
          rx_speed: rxSpeed,
          tx_speed: txSpeed,
          timestamp: new Date(),
        }
      });
    } catch (e) {
      // WebSocket not available
    }
    
  } catch (error) {
    console.error('[SNMP CLI] Collection error:', error);
  }
}
