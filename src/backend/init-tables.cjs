const { Client } = require('pg');
const fs = require('fs');

async function initTables() {
  const sql = fs.readFileSync('./src/database/init.sql', 'utf8');
  const client = new Client({
    host: '192.168.2.100',
    port: 15432,
    database: 'network_panel',
    user: 'postgres',
    password: 'admin@123',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL!');
    await client.query(sql);
    console.log('Tables created successfully!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

initTables();
