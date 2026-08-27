import { getFortiGateAdapter } from '../fortigate/adapter.js';
import { query } from '../database/index.js';

const adapter = getFortiGateAdapter();
let collectionInterval: NodeJS.Timeout | null = null;
// Track previous cumulative bytes for speed calculation
let prevWanRx = 0;
let prevWanTx = 0;
let prevTimestamp = 0;

export async function collectFortiGateData(): Promise<void> {
  if (!adapter.isConfigured()) return;

  try {
    console.log('Collecting FortiGate data...');
    const data = await adapter.getAllData();

    // CPU/Memory from resource/usage
    const res = data.resources as any;
    const cpuUsage = res?.cpu?.[0]?.current || 0;
    const memList = res?.memory || [];
    const memUsage = memList.length > 0 ? memList[0].current || 0 : 0;
    const memTotal = res?.memory_total ? parseInt(res.memory_total) : 0;
    const memUsed = memTotal > 0 ? Math.floor(memTotal * memUsage / 100) : 0;
    const temp = res?.cpu_temperature?.[0]?.current || 0;

    // Sessions from firewall policies
    const policies = data.policies as any[];
    const sessionCount = policies.reduce((s: number, p: any) => s + (p.active_sessions || 0), 0);

    const status = data.status as any;
    const version = status?.version || 'v6.2.16';

    // Insert system_status
    await query(
      'INSERT INTO system_status (cpu_usage, memory_usage, memory_total, memory_used, temperature, session_count, session_rate, packet_rate, firmware_version, uptime_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [cpuUsage, memUsage, memTotal, memUsed, temp, sessionCount, 0, 0, version, 0]
    );

    // Calculate WAN speed from monitor interfaces (cumulative bytes -> rate)
    const monIfaces = data.monitorInterfaces as any;
    const now = Date.now();
    const wan = monIfaces?.wan;
    let wanRxBytes = 0, wanTxBytes = 0;
    if (wan) {
      wanRxBytes = wan.rx_bytes || 0;
      wanTxBytes = wan.tx_bytes || 0;
    }

    // Calculate speed (bytes/sec) from delta
    let rxSpeed = 0, txSpeed = 0;
    if (prevTimestamp > 0 && (now - prevTimestamp) > 0) {
      const elapsedSec = (now - prevTimestamp) / 1000;
      rxSpeed = Math.max(0, Math.floor((wanRxBytes - prevWanRx) / elapsedSec));
      txSpeed = Math.max(0, Math.floor((wanTxBytes - prevWanTx) / elapsedSec));
    }
    prevWanRx = wanRxBytes;
    prevWanTx = wanTxBytes;
    prevTimestamp = now;

    // Store traffic stats with calculated speed
    await query(
      'INSERT INTO traffic_stats (interface_name, rx_bytes, tx_bytes, rx_packets, tx_packets) VALUES ($1,$2,$3,$4,$5)',
      ['wan1', rxSpeed, txSpeed, 0, 0]
    );

    // Store history metrics for charts
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['cpu', cpuUsage]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['memory', memUsage]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['sessions', sessionCount]);
    // Traffic in Mbps for chart
    const rxMbps = (rxSpeed * 8 / 1000000).toFixed(2);
    const txMbps = (txSpeed * 8 / 1000000).toFixed(2);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['traffic_in', parseFloat(rxMbps)]);
    await query('INSERT INTO history_metrics (metric_type, value) VALUES ($1,$2)', ['traffic_out', parseFloat(txMbps)]);

    // Update devices from cmdb interfaces
    const cmdbIfaces = data.cmdbInterfaces as any[];
    for (const iface of cmdbIfaces) {
      if (iface.ip && iface.ip !== '0.0.0.0' && iface.name) {
        await query(
          'INSERT INTO devices (id,name,type,ip_address,mac_address,interface_name,is_online) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET ip_address=$4,last_seen=NOW()',
          ['iface-' + iface.name, iface.name, 'router', iface.ip, iface.mac || '', iface.name, true]
        );
      }
    }

    // Update VPN devices
    const vpnConfig = data.vpnConfig as any[];
    for (const t of vpnConfig) {
      await query(
        'INSERT INTO devices (id,name,type,ip_address,interface_name,is_online) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET last_seen=NOW()',
        ['vpn-' + t.name, t.name, 'router', t.remote_gw || '', t.interface || '', true]
      );
    }

    // Log event
    const vpnCount = (data.vpnTunnels as any[]).length;
    await query('INSERT INTO events (level,source,message) VALUES ($1,$2,$3)',
      ['info', 'fortigate', 'CPU:' + cpuUsage + '% Mem:' + memUsage + '% 会话:' + sessionCount + ' 下行:' + rxMbps + 'Mbps 上行:' + txMbps + 'Mbps VPN:' + vpnCount]);

    console.log('Collected: CPU=' + cpuUsage + '% Mem=' + memUsage + '% Sessions=' + sessionCount + ' RX=' + rxMbps + 'Mbps TX=' + txMbps + 'Mbps');
  } catch (error: any) {
    console.error('Collection failed:', error.message);
  }
}

export function startFortiGateCollector(intervalMs: number = 5000): void {
  collectFortiGateData();
  collectionInterval = setInterval(collectFortiGateData, intervalMs);
  console.log('FortiGate collector started');
}

export function stopFortiGateCollector(): void {
  if (collectionInterval) { clearInterval(collectionInterval); collectionInterval = null; }
}

export function isFortiGateConfigured(): boolean { return adapter.isConfigured(); }
