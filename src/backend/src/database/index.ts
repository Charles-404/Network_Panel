import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'network_panel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initializeDatabase(): Promise<void> {
  console.log('Database tables already created via init-db.cjs');
}

export async function query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  return pool.query(text, params);
}

export async function getOne(text: string, params?: unknown[]): Promise<unknown> {
  const result = await pool.query(text, params);
  return result.rows[0];
}

export async function getAll(text: string, params?: unknown[]): Promise<unknown[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
