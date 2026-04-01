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
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || '--password--',
  server: process.env.DB_SERVER || 'ip',
  database: process.env.DB_NAME || 'db',
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
export const serviceName = process.env.SERVICE_NAME || process.env.HOSTNAME || 'mcp-server';

// Site-specific database and view configuration
// Set these env vars to point to the correct databases for each site (KB, KNA, KM, ...)
export const assetDb = process.env.ASSET_DB || 'BC_VLTS_DATA';
export const documentDb = process.env.DOCUMENT_DB || 'AIM_KANEKA';
export const assetView = process.env.ASSET_VIEW || 'BCAssetPropertiesViewByNameBCE';
export const projectView = process.env.PROJECT_VIEW || 'ProjectPropertiesView';
export const documentView = process.env.DOCUMENT_VIEW || 'DocumentPropertiesViewCoPilot';
export const assetDocRefView = process.env.ASSET_DOC_REF_VIEW || 'AssetDocRefViewCoPilot';
