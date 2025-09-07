import { getPool } from './db.js';
import * as Sentry from '@sentry/node';

export async function handleGetBasicInfo(args: any) {
  const { message = "Hello from MCP server!" } = args;

  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT TOP 10 name FROM sys.databases');
    return {
      content: [
        {
          type: "text",
          text: `Basic info: ${message}. DB connection successful. Found ${result.recordset.length} databases. Server is running with simple auth.`
        }
      ]
    };
  } catch (error) {
    // Only capture exception if Sentry is initialized
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error querying DB: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}
