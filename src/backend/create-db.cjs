const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    host: '192.168.2.100',
    port: 15432,
    user: 'postgres',
    password: 'admin@123',
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL!');
    
    // Create database
    try {
      await client.query('CREATE DATABASE network_panel');
      console.log('Database "network_panel" created!');
    } catch (err) {
      if (err.code === '42P07') {
        console.log('Database "network_panel" already exists');
      } else {
        throw err;
      }
    }
    
    await client.end();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createDatabase();