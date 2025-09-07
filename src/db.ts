import * as sql from 'mssql';
import { dbConfig } from './config.js';

let pool: any = null;

export async function initDbPool(): Promise<void> {
  try {
    pool = await sql.connect(dbConfig);
    console.error('DB pool connected');
  } catch (error) {
    console.error('DB connection failed:', error);
    process.exit(1);
  }
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.close();
    console.error('DB pool closed');
  }
}

export function getPool(): any {
  if (!pool) {
    throw new Error('DB pool not initialized');
  }
  return pool;
}
