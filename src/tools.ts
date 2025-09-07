import { getPool } from './db.js';
import * as Sentry from '@sentry/node';
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export const tools = [
  {
    name: "get_basic_info",
    description: "Get basic information as text",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Optional message to include"
        }
      }
    }
  },
  {
    name: "run_sql",
    description: "Execute any SQL command on the database",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        }
      },
      required: ["query"]
    }
  }
];

export async function handleToolCall(name: string, args: any) {
  try {
    switch (name) {
      case "get_basic_info":
        return await handleGetBasicInfo(args);
      case "run_sql":
        return await handleRunSql(args);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    Sentry.captureException(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

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

export async function handleRunSql(args: any) {
  const { query } = args;

  try {
    const pool = getPool();
    const result = await pool.request().query(query);

    if (result.recordset && result.recordset.length > 0) {
      // SELECT query with results
      return {
        content: [
          {
            type: "text",
            text: `Query executed successfully. Rows returned: ${result.recordset.length}\n${JSON.stringify(result.recordset, null, 2)}`
          }
        ]
      };
    } else if (result.rowsAffected && result.rowsAffected.length > 0) {
      // Non-SELECT query
      return {
        content: [
          {
            type: "text",
            text: `Query executed successfully. Rows affected: ${result.rowsAffected[0]}`
          }
        ]
      };
    } else {
      // Other cases
      return {
        content: [
          {
            type: "text",
            text: `Query executed successfully.`
          }
        ]
      };
    }
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
          text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}
