const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  mac_address VARCHAR(17),
  interface_name VARCHAR(50),
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS traffic_stats (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50),
  interface_name VARCHAR(50),
  rx_bytes BIGINT DEFAULT 0,
  tx_bytes BIGINT DEFAULT 0,
  rx_packets BIGINT DEFAULT 0,
  tx_packets BIGINT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS system_status (
  id SERIAL PRIMARY KEY,
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  memory_total INTEGER,
  memory_used INTEGER,
  temperature DECIMAL(5,2),
  session_count INTEGER,
  session_rate INTEGER,
  packet_rate INTEGER,
  firmware_version VARCHAR(50),
  uptime_seconds BIGINT,
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20),
  source VARCHAR(100),
  message TEXT,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(200),
  message TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS history_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50),
  value DECIMAL(10,2),
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS topology_nodes (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'online',
  icon VARCHAR(50),
  details JSONB,
  pos_x FLOAT DEFAULT 0,
  pos_y FLOAT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS topology_edges (
  id VARCHAR(50) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  target VARCHAR(50) NOT NULL,
  animated BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_history_metrics_type ON history_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_history_metrics_timestamp ON history_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_status_timestamp ON system_status(timestamp);
`;

async function initDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || '192.168.2.100',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'network_panel',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin@123',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL!');
    await client.query(sql);
    console.log('All tables created successfully!');

    const res = await client.query('SELECT COUNT(*) FROM topology_nodes');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('Seeding topology data...');
      await seedTopology(client);
      console.log('Topology seeded!');
    }

    const devRes = await client.query('SELECT COUNT(*) FROM devices');
    if (parseInt(devRes.rows[0].count) === 0) {
      console.log('Seeding device data...');
      await seedDevices(client);
      console.log('Devices seeded!');
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

async function seedTopology(client) {
  var nodes = [
    {id:'internet',type:'internet',label:'Internet',status:'online',icon:'Globe',det:null,px:400,py:0},
    {id:'fortigate',type:'fortigate',label:'FortiGate 30E',status:'online',icon:'Shield',det:JSON.stringify({ip:'10.0.0.1'}),px:400,py:150},
    {id:'wan',type:'interface',label:'WAN (wan1)',status:'online',icon:'Wifi',det:null,px:400,py:100},
    {id:'lan1',type:'interface',label:'LAN (lan1)',status:'online',icon:'Network',det:null,px:200,py:300},
    {id:'lan2',type:'interface',label:'LAN (lan2)',status:'online',icon:'Network',det:null,px:400,py:300},
    {id:'wifi',type:'interface',label:'Wi-Fi',status:'online',icon:'Wifi',det:null,px:600,py:300},
    {id:'switch',type:'switch',label:'Switch',status:'online',icon:'Server',det:JSON.stringify({ports:8}),px:200,py:450},
    {id:'ap',type:'ap',label:'Access Point',status:'online',icon:'Wifi',det:JSON.stringify({ssid:'HomeNetwork'}),px:600,py:450},
    {id:'device-mac',type:'device',label:'MacBook Pro',status:'online',icon:'Laptop',det:null,px:100,py:600},
    {id:'device-pc',type:'device',label:'Desktop-PC',status:'online',icon:'Monitor',det:null,px:200,py:600},
    {id:'device-nas',type:'device',label:'NAS-Synology',status:'online',icon:'HardDrive',det:null,px:300,py:600},
    {id:'device-iphone',type:'device',label:'iPhone 15 Pro',status:'online',icon:'Smartphone',det:null,px:500,py:600},
    {id:'device-ipad',type:'device',label:'iPad Air',status:'online',icon:'Tablet',det:null,px:600,py:600},
    {id:'device-tv',type:'device',label:'Smart-TV',status:'online',icon:'Tv',det:null,px:700,py:600},
  ];
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    await client.query('INSERT INTO topology_nodes (id,type,label,status,icon,details,pos_x,pos_y) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [n.id,n.type,n.label,n.status,n.icon,n.det,n.px,n.py]);
  }

  var edges = [
    {id:'e-internet-wan',src:'internet',tgt:'wan',anim:true},
    {id:'e-wan-fortigate',src:'wan',tgt:'fortigate',anim:true},
    {id:'e-fortigate-lan1',src:'fortigate',tgt:'lan1',anim:true},
    {id:'e-fortigate-lan2',src:'fortigate',tgt:'lan2',anim:true},
    {id:'e-fortigate-wifi',src:'fortigate',tgt:'wifi',anim:true},
    {id:'e-lan1-switch',src:'lan1',tgt:'switch',anim:false},
    {id:'e-wifi-ap',src:'wifi',tgt:'ap',anim:false},
    {id:'e-switch-device-mac',src:'switch',tgt:'device-mac',anim:false},
    {id:'e-switch-device-pc',src:'switch',tgt:'device-pc',anim:false},
    {id:'e-switch-device-nas',src:'switch',tgt:'device-nas',anim:false},
    {id:'e-ap-device-iphone',src:'ap',tgt:'device-iphone',anim:false},
    {id:'e-ap-device-ipad',src:'ap',tgt:'device-ipad',anim:false},
    {id:'e-ap-device-tv',src:'ap',tgt:'device-tv',anim:false},
  ];
  for (var j = 0; j < edges.length; j++) {
    var e = edges[j];
    await client.query('INSERT INTO topology_edges (id,source,target,animated) VALUES ($1,$2,$3,$4)',
      [e.id,e.src,e.tgt,e.anim]);
  }
}

async function seedDevices(client) {
  var devs = [
    {id:'dev-1',name:'MacBook Pro',type:'mac',ip:'10.0.0.101',mac:'AA:BB:CC:DD:EE:10',iface:'lan1'},
    {id:'dev-2',name:'iPhone 15 Pro',type:'iphone',ip:'10.0.2.101',mac:'AA:BB:CC:DD:EE:11',iface:'wifi'},
    {id:'dev-3',name:'iPad Air',type:'iphone',ip:'10.0.2.102',mac:'AA:BB:CC:DD:EE:12',iface:'wifi'},
    {id:'dev-4',name:'Desktop-PC',type:'pc',ip:'10.0.0.103',mac:'AA:BB:CC:DD:EE:13',iface:'lan1'},
    {id:'dev-5',name:'NAS-Synology',type:'nas',ip:'10.0.0.104',mac:'AA:BB:CC:DD:EE:14',iface:'lan1'},
    {id:'dev-6',name:'Smart-TV',type:'iot',ip:'10.0.2.103',mac:'AA:BB:CC:DD:EE:15',iface:'wifi'},
    {id:'dev-7',name:'Printer-HP',type:'printer',ip:'10.0.0.105',mac:'AA:BB:CC:DD:EE:16',iface:'lan1'},
    {id:'dev-8',name:'Android-Phone',type:'android',ip:'10.0.2.104',mac:'AA:BB:CC:DD:EE:17',iface:'wifi'},
  ];
  for (var i = 0; i < devs.length; i++) {
    var d = devs[i];
    await client.query('INSERT INTO devices (id,name,type,ip_address,mac_address,interface_name,is_online) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [d.id,d.name,d.type,d.ip,d.mac,d.iface,true]);
  }
}

initDatabase();
