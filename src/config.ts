import type { IncomingMessage, ServerResponse } from 'http';

export interface DbConfig {
  user: string;
  password: string;
  server: string;
  database: string;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

export const dbConfig: DbConfig = {
  user: process.env.DB_USER || 'airflow',
  password: process.env.DB_PASSWORD || '0f6xEJ8C0k0Jj8l8',
  server: process.env.DB_SERVER || '10.232.10.65\\BI_PROD',
  database: process.env.DB_NAME || 'BI_DWH',
  options: {
    encrypt: false,
    trustServerCertificate: process.env.TRUST_CERT === 'true' || false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export const apiKey = process.env.API_KEY || 'your-static-api-key-here';

export const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
