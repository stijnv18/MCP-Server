import { getPool } from './db.js';
import * as Sentry from '@sentry/node';
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export const tools = [
  {
    name: "get_list_views",
    description: "Get a list of all views in the database",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "The database to query (default is current database)",
        }
      },
      required: ["database"]
    }
  },
  {
    name: "get_databases",
    description: "Get a list of all databases",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_tables",
    description: "Get a list of all tables in the database",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "The database to query (default is current database)",
        }
      },
      required: ["database"]
    }
  },
  {
    name: "get_columns",
    description: "Get a list of columns for a specific table or view",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "The fully qualified table name (schema.table) to get columns for"
        },
        database: {
          type: "string",
          description: "The database to query (default is current database)"
        }
      },
      required: ["table"]
    }
  },
  {
    name: "execute_stored_procedure",
    description: "Execute a stored procedure with parameters",
    inputSchema: {
      type: "object",
      properties: {
        procedure: {
          type: "string",
          description: "The stored procedure name to execute"
        },
        parameters: {
          type: "array",
          description: "Array of parameter objects with name and value",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Parameter name"
              },
              value: {
                type: "string",
                description: "Parameter value"
              }
            },
            required: ["name", "value"]
          }
        },
        database: {
          type: "string",
          description: "The database to query (default is current database)"
        }
      },
      required: ["procedure"]
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
  },
  {
    name: "get_table_joins",
    description: "Get join information from 'Joins' extended property on tables",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Specific table name to get joins for (optional - if not provided, returns joins for all tables)"
        },
        database: {
          type: "string",
          description: "The database to query (default is current database)"
        }
      },
      required: ["database"]
    }
  }
];


export async function getListViewsHandler(args: any) {
  const { database } = args;

  try {
    const pool = getPool();
    let query = 'SELECT s.name AS schema_name, v.name AS view_name FROM sys.views v INNER JOIN sys.schemas s ON v.schema_id = s.schema_id';
    if (database) {
      query = `USE [${database}]; ${query}`;
    }
    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);
    const viewsBySchema: Record<string, string[]> = {};
    result.recordset.forEach((row: any) => {
      if (!viewsBySchema[row.schema_name]) {
        viewsBySchema[row.schema_name] = [];
      }
      viewsBySchema[row.schema_name].push(row.view_name);
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ database: database || 'current', schemas: viewsBySchema }, null, 2)
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
          text: `Error querying views: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getDatabasesHandler(args: any) {
  try {
    const pool = getPool();
    const query = 'SELECT name FROM sys.databases';
    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);
    const databases = result.recordset.map((row: any) => row.name);
    return {
      content: [
        {
          type: "text",
          text: `Databases: ${databases.join(', ')}`
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
          text: `Error querying databases: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getTablesHandler(args: any) {
  const { database } = args;

  try {
    const pool = getPool();
    let query = 'SELECT s.name AS schema_name, t.name AS table_name FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id = s.schema_id';
    if (database) {
      query = `USE [${database}]; ${query}`;
    }
    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);
    const tablesBySchema: Record<string, string[]> = {};
    result.recordset.forEach((row: any) => {
      if (!tablesBySchema[row.schema_name]) {
        tablesBySchema[row.schema_name] = [];
      }
      tablesBySchema[row.schema_name].push(row.table_name);
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ database: database || 'current', schemas: tablesBySchema }, null, 2)
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
          text: `Error querying tables: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getColumnsHandler(args: any) {
  const { table, database } = args;

  try {
    const pool = getPool();
    let query = `
      SELECT c.name AS column_name, t.name AS data_type, c.max_length, c.precision, c.scale, c.is_nullable
      FROM sys.columns c
      INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('${table}')
    `;
    if (database) {
      query = `USE [${database}]; ${query}`;
    }
    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);
    const columns = result.recordset.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      max_length: row.max_length,
      precision: row.precision,
      scale: row.scale,
      nullable: row.is_nullable
    }));
    return {
      content: [
        {
          type: "text",
          text: `Columns in table ${table}: ${JSON.stringify(columns, null, 2)}`
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
          text: `Error querying columns for table ${table}: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function executeStoredProcedureHandler(args: any) {
  const { procedure, parameters = [], database } = args;

  try {
    const pool = getPool();
    let query = `EXEC ${procedure}`;
    if (parameters.length > 0) {
      const paramStrings = parameters.map((param: any) => `@${param.name} = '${param.value}'`);
      query += ' ' + paramStrings.join(', ');
    }
    if (database) {
      query = `USE [${database}]; ${query}`;
    }
    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);
    let response = `Stored procedure ${procedure} executed successfully.`;
    if (result.recordset && result.recordset.length > 0) {
      response += ` Results: ${JSON.stringify(result.recordset, null, 2)}`;
    }
    if (result.rowsAffected && result.rowsAffected.length > 0) {
      response += ` Rows affected: ${result.rowsAffected[0]}`;
    }
    return {
      content: [
        {
          type: "text",
          text: response
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
          text: `Error executing stored procedure ${procedure}: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function runSqlHandler(args: any) {
  const { query } = args;

  try {
    const pool = getPool();
    console.log(`Executing query: ${query}`);
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

// Handler for getting table joins from extended properties
export async function getTableJoinsHandler(args: any) {
  const { table, database } = args;

  try {
    const pool = getPool();
    let query = '';

    if (database) {
      query = `USE [${database}]; `;
    }

    // Query for the extended property containing the joins JSON structure
    query += `
      SELECT ep.value AS joins_structure
      FROM sys.extended_properties ep
      WHERE ep.class = 0 
      AND ep.major_id = 0 
      AND ep.minor_id = 0 
      AND ep.name = 'Joins'
    `;

    console.log(`Executing query: ${query}`);
    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              database: database || 'current',
              table_joins: [],
              message: "No 'Joins' extended property found at database level"
            }, null, 2)
          }
        ]
      };
    }

    const joinsStructure = JSON.parse(result.recordset[0].joins_structure);
    const dbName = database || Object.keys(joinsStructure)[0]; // Use provided database or first one in structure
    const dbJoins = joinsStructure[dbName] || joinsStructure[Object.keys(joinsStructure)[0]];

    let tableJoins: any[] = [];

    if (table) {
      // Get joins for specific table
      const schemaJoins = Object.values(dbJoins)[0] as any; // Assuming first schema
      if (schemaJoins[table]) {
        tableJoins.push({
          schema: Object.keys(dbJoins)[0],
          table: table,
          joins: schemaJoins[table].joins
        });
      }
    } else {
      // Get joins for all tables
      Object.entries(dbJoins).forEach(([schemaName, schemaData]: [string, any]) => {
        Object.entries(schemaData).forEach(([tableName, tableData]: [string, any]) => {
          if (tableData.joins) {
            tableJoins.push({
              schema: schemaName,
              table: tableName,
              joins: tableData.joins
            });
          }
        });
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            database: dbName,
            table_joins: tableJoins
          }, null, 2)
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
          text: `Error getting table joins: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

// Handler map: tool name -> handler function
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  get_list_views: getListViewsHandler,
  get_databases: getDatabasesHandler,
  get_tables: getTablesHandler,
  get_columns: getColumnsHandler,
  execute_stored_procedure: executeStoredProcedureHandler,
  run_sql: runSqlHandler,
  get_table_joins: getTableJoinsHandler,
};

// Updated handleToolCall
export async function handleToolCall(name: string, args: any) {
  const handler = toolHandlers[name];
  if (!handler) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}`
    );
  }

  try {
    return await handler(args);
  } catch (error) {
    Sentry.captureException(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
