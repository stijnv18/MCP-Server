import { getPool } from './db.js';
import * as Sentry from '@sentry/node';

export async function handleGetBasicInfo(args: any) {
  const { message = "Hello from MCP server!" } = args;

  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT TOP 10 * FROM YourTable');
    return {
      content: [
        {
          type: "text",
          text: `Basic info: ${message}. DB rows: ${result.recordset.length}. Server is running with simple auth.`
        }
      ]
    };
  } catch (error) {
    Sentry.captureException(error);
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
