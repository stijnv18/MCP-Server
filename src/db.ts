import sql from 'mssql';
import { dbConfig, serviceName } from './config.js';

let pool: any = null;

export async function initDbPool(): Promise<void> {
  try {
    console.error(`[${serviceName}] Opening DB pool`, {
      server: dbConfig.server,
      database: dbConfig.database,
      trustServerCertificate: dbConfig.options.trustServerCertificate,
    });
    pool = await sql.connect(dbConfig);
    console.error(`[${serviceName}] DB pool connected`);
  } catch (error) {
    console.error(`[${serviceName}] DB connection failed:`, error);
    process.exit(1);
  }
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.close();
    console.error(`[${serviceName}] DB pool closed`);
  }
}

export function getPool(): any {
  if (!pool) {
    throw new Error('DB pool not initialized');
  }
  return pool;
}
