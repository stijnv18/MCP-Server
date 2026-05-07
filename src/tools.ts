import { getPool } from './db.js';
import * as Sentry from '@sentry/node';
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { assetDb, documentDb, assetView, projectView, documentView, assetDocRefView, serviceName } from './config.js';

function logToolEvent(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.error(`[${serviceName}] ${message}`, details);
    return;
  }

  console.error(`[${serviceName}] ${message}`);
}

function pruneNullValues(value: any): any {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (normalizedValue === '' || normalizedValue === '-') {
      return undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => pruneNullValues(item))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    const filtered: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const prunedValue = pruneNullValues(nestedValue);
      if (prunedValue !== undefined) {
        filtered[key] = prunedValue;
      }
    }

    return filtered;
  }

  return value;
}

function stringifyWithoutNulls(value: unknown): string {
  const prunedValue = pruneNullValues(value);
  return JSON.stringify(prunedValue ?? {}, null, 2);
}

function extractQueryTargets(query: string): string[] {
  const matches = query.match(/\b(?:FROM|JOIN|UPDATE|INTO|EXEC|MERGE)\s+([^\s,;()]+)/gi) || [];
  const targets = matches.map((match) => match.replace(/^\b(?:FROM|JOIN|UPDATE|INTO|EXEC|MERGE)\s+/i, '').trim());
  return Array.from(new Set(targets));
}

function getToolTargets(name: string, args: any): Record<string, unknown> {
  switch (name) {
    case 'get_list_views':
      return { database: args?.database || 'current', systemView: 'sys.views' };
    case 'get_databases':
      return { database: 'master', systemView: 'sys.databases' };
    case 'get_tables':
      return { database: args?.database || 'current', systemView: 'sys.tables' };
    case 'get_columns':
      return { database: args?.database || 'current', table: args?.table };
    case 'execute_stored_procedure':
      return { database: args?.database || 'current', procedure: args?.procedure };
    case 'run_sql':
      return { targets: extractQueryTargets(args?.query || '') };
    case 'get_table_joins':
      return { database: args?.database || 'current', table: args?.table || 'all tables' };
    case 'get_distinct_values':
      return { database: args?.database || 'current', table: args?.table, column: args?.column };
    case 'search_assets':
      return { database: assetDb, table: `[${assetDb}].[dbo].[${assetView}]` };
    case 'search_projects':
      return { database: assetDb, table: `[${assetDb}].[dbo].[${projectView}]` };
    case 'search_documents':
      return { database: documentDb, table: `[${documentDb}].[dbo].[${documentView}]` };
    case 'get_asset_details':
      return { database: assetDb, table: `[${assetDb}].[dbo].[${assetView}]` };
    case 'get_project_details':
      return { database: assetDb, table: `[${assetDb}].[dbo].[${projectView}]` };
    case 'get_assets_for_document':
      return { database: documentDb, table: `[${documentDb}].[dbo].[${assetDocRefView}]` };
    case 'get_related_documents_for_asset':
      return { database: documentDb, table: `[${documentDb}].[dbo].[${assetDocRefView}]` };
    case 'get_database_schema':
      return {
        database: args?.database,
        includeTables: args?.include_tables !== false,
        includeViews: args?.include_views !== false,
      };
    default:
      return {};
  }
}


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
    description: "Get a list of columns for one or more tables or views",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          oneOf: [
            { type: "string", description: "A single fully qualified table name (schema.table)" },
            { type: "array", items: { type: "string" }, description: "Multiple fully qualified table names" }
          ],
          description: "The fully qualified table name(s) (schema.table) to get columns for"
        },
        database: {
          type: "string",
          description: "The database to query (default is current database)"
        }
      },
      required: ["table", "database"]
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
  },
  {
    name: "get_distinct_values",
    description: "Get distinct values from one or more columns, capped at 25 unique values each, plus total counts",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "The fully qualified table name (schema.table) to get distinct values from"
        },
        column: {
          oneOf: [
            { type: "string", description: "A single column name" },
            { type: "array", items: { type: "string" }, description: "Multiple column names" }
          ],
          description: "The column name(s) to get distinct values from"
        },
        database: {
          type: "string",
          description: "The database to query (default is current database)"
        }
      },
      required: ["table", "column", "database"]
    }
  },
  {
    name: "search_assets",
    description: `Search for assets in ${assetDb}.${assetView} with various filters. Use 'keyword' when the user mentions a section, process area, or descriptive term (e.g. 'raw material', 'cooling water', 'flare') — it searches across process, subprocess, functional location, unit, and classification fields simultaneously. Combine with 'department' for scoped searches.`,
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "Free-text keyword that searches across [ASSET CATEGORY], [ASSET CLASS], [ASSET SUB CLASS], [FUNCTIONAL LOCATION], [UNIT], [PROCESS], and [SUB PROCESS] simultaneously using OR logic. Use this for section/area/process names the user provides that don't map to a specific field (e.g. 'raw material', 'utilities', 'cooling water', 'flare')."
        },
        asset_number: {
          type: "string",
          description: "Asset number to search for (supports partial matching with %)"
        },
        department: {
          type: "string",
          description: "3-character department code (MOD, EPE, MSE, SUP)"
        },
        project_number: {
          type: "string",
          description: "Project number to filter assets"
        },
        sap_equipment_number: {
          type: "string",
          description: "SAP equipment number"
        },
        asset_category: {
          type: "string",
          description: "Asset category for filtering"
        },
        asset_class: {
          type: "string",
          description: "Asset class for filtering"
        },
        asset_subclass: {
          type: "string",
          description: "Asset subclass for filtering"
        },
        area: {
          type: "string",
          description: "Area code (e.g. 'B300') stored in the [AREA] column"
        },
        sub_area: {
          type: "string",
          description: "Sub area code (e.g. '02') stored in the [SUB AREA] column"
        },
        functional_location: {
          type: "string",
          description: "Functional location for process-related searches"
        },
        unit: {
          type: "string",
          description: "Unit for process-related searches"
        },
        process: {
          type: "string",
          description: "Process for process-related searches"
        },
        subprocess: {
          type: "string",
          description: "Subprocess for process-related searches"
        },
        in_workflow: {
          type: "boolean",
          description: "Filter assets that are in workflow ([c_psApproval_WFStateApproval] is not null)"
        },
        include_retired: {
          type: "boolean",
          description: "Include retired/decommissioned assets (default: false)",
          default: false
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 25)",
          default: 25
        }
      }
    }
  },
  {
    name: "search_projects",
    description: `Search for projects in ${assetDb}.${projectView}`,
    inputSchema: {
      type: "object",
      properties: {
        project_number: {
          type: "string",
          description: "Project number (supports partial matching with %)"
        },
        project_type: {
          type: "string",
          description: "Filter by project type ('RFE' for investments, 'all' for all)",
          enum: ["RFE", "all"]
        },
        project_status: {
          type: "string",
          description: "Filter by project status ('open' for active projects, 'closed' for completed, 'all' for all)",
          enum: ["open", "closed", "all"],
          default: "all"
        },
        is_plant_environment: {
          type: "boolean",
          description: "Filter for plant/as-built environment projects ([PROJECT NUMBER]='-')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 25)",
          default: 25
        }
      }
    }
  },
  {
    name: "search_documents",
    description: `Search for documents in ${documentDb} ${documentView}. Use 'keyword' to search across both title and subcategory when the user mentions a section, area, or process name (e.g. 'raw material', 'utilities', 'cooling water'). Use 'category' for document types (PID, INV, COM, LAY). Use 'department' for 3-letter dept codes (SUP, EPE, MOD, MSE). If keyword returns 0 results, try get_distinct_values on c_psDocument_DocumentSubC_0 to discover valid subcategory names.`,
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "Free-text keyword that searches [c_psDocument_DocumentTitle], [c_psDocument_DocumentSubC_0], AND [c_psDocument_DocumentCategory] simultaneously using OR logic. Use this for section names, process areas, document type codes, or any descriptive term from the user (e.g. 'raw material', 'cooling water', 'PID', 'flare'). Preferred over 'title', 'category', or 'subcategory' alone when the term could appear in more than one field."
        },
        title: {
          type: "string",
          description: "Document title to search for ([c_psDocument_DocumentTitle]). Use 'keyword' instead if the term might also be in subcategory."
        },
        project_number: {
          type: "string",
          description: "Project number associated with documents"
        },
        category: {
          type: "string",
          description: "Document type/category ([c_psDocument_DocumentCategory]). Known values: PID (Piping & Instrumentation Diagrams), INV (inventory), COM (completion reports), LAY (layout drawings)."
        },
        subcategory: {
          type: "string",
          description: "Document subcategory or section grouping ([c_psDocument_DocumentSubC_0]). Examples: section names, process areas. Supports partial matching. Use 'keyword' if unsure whether the term is in title or subcategory."
        },
        vendor: {
          type: "string",
          description: "Vendor information ([c_psdocument_vendor])"
        },
        department: {
          type: "string",
          description: "Department code ([c_Custom_Department]) - 3-letter code (MOD, EPE, MSE, SUP)"
        },
        reference_drawing: {
          type: "string",
          description: "Reference drawing number ([c_psDocument_ReferenceDrawingN])"
        },
        include_retired: {
          type: "boolean",
          description: "Include retired/decommissioned documents ([c_psApproval_WFStateApproval]='Retired'). Default is false",
          default: false
        },
        is_plant_environment: {
          type: "boolean",
          description: "Filter for plant/as-built environment documents ([c_psProject_ProjectNumber]='-')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 25)",
          default: 25
        }
      },
      required: []
    }
  },
  {
    name: "get_asset_details",
    description: "Get detailed asset information by asset tag or SAP equipment number",
    inputSchema: {
      type: "object",
      properties: {
        asset_tag: {
          type: "string",
          description: "Asset tag number (e.g., 'V 2210 H EPE', 'V 2210 H', or 'V')"
        },
        sap_equipment_number: {
          type: "string",
          description: "SAP equipment number"
        },
        department: {
          type: "string",
          description: "3-character department code (MOD, EPE, MSE, SUP)"
        }
      }
    }
  },
  {
    name: "get_project_details",
    description: "Get detailed project information by project number",
    inputSchema: {
      type: "object",
      properties: {
        project_number: {
          type: "string",
          description: "Project number to get details for"
        }
      },
      required: ["project_number"]
    }
  },
  {
    name: "get_assets_for_document",
    description: `Get assets related to a specific document using ${assetDocRefView}`,
    inputSchema: {
      type: "object",
      properties: {
        document_title: {
          type: "string",
          description: "Document title to find related assets for"
        },
        file_name: {
          type: "string",
          description: "File name to find related assets for"
        },
        department: {
          type: "string",
          description: "Department code ([c_Custom_Department]) - 3-letter code (MOD, EPE, MSE, SUP)"
        },
        include_retired: {
          type: "boolean",
          description: "Include retired/decommissioned assets. Default is false",
          default: false
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 25)",
          default: 25
        }
      }
    }
  },
  {
    name: "get_related_documents_for_asset",
    description: `Get documents related to a specific project or asset using ${assetDocRefView}`,
    inputSchema: {
      type: "object",
      properties: {
        project_number: {
          type: "string",
          description: "Project number to find related documents for (default: '-' for plant environment)",
          default: "-"
        },
        asset_tag: {
          type: "string",
          description: "Asset tag to find related documents for"
        },
        sap_equipment_number: {
          type: "string",
          description: "SAP equipment number to find related documents for"
        },
        department: {
          type: "string",
          description: "Department code ([c_Custom_Department]) - 3-letter code (MOD, EPE, MSE, SUP)"
        },
        include_retired: {
          type: "boolean",
          description: "Include retired/decommissioned documents. Default is false",
          default: false
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 25)",
          default: 25
        }
      }
    }
  },
  {
    name: "get_database_schema",
    description: `Get schema information for specific databases (${assetDb} or ${documentDb})`,
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "Database name",
          enum: [assetDb, documentDb]
        },
        include_views: {
          type: "boolean",
          description: "Include views in schema (default: true)",
          default: true
        },
        include_tables: {
          type: "boolean",
          description: "Include tables in schema (default: true)",
          default: true
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
          text: stringifyWithoutNulls({ database: database || 'current', schemas: viewsBySchema })
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
          text: stringifyWithoutNulls({ database: database || 'current', schemas: tablesBySchema })
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
  const tables: string[] = Array.isArray(table) ? table : [table];

  try {
    const pool = getPool();
    const results: Record<string, any[]> = {};

    for (const t of tables) {
      let query = `
        SELECT c.name AS column_name, t.name AS data_type, c.max_length, c.precision, c.scale, c.is_nullable
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID('${t}')
      `;
      if (database) {
        query = `USE [${database}]; ${query}`;
      }
      console.log(`Executing query: ${query}`);
      const result = await pool.request().query(query);
      results[t] = result.recordset.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        max_length: row.max_length,
        precision: row.precision,
        scale: row.scale,
        nullable: row.is_nullable
      }));
    }

    return {
      content: [
        {
          type: "text",
          text: stringifyWithoutNulls(tables.length === 1 ? { table: tables[0], columns: results[tables[0]] } : results)
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
          text: `Error querying columns for table(s) ${tables.join(', ')}: ${error instanceof Error ? error.message : String(error)}`
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
      response += ` Results: ${stringifyWithoutNulls(result.recordset)}`;
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
            text: `Query executed successfully. Rows returned: ${result.recordset.length}\n${stringifyWithoutNulls(result.recordset)}`
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
            text: stringifyWithoutNulls({
              database: database || 'current',
              table_joins: [],
              message: "No 'Joins' extended property found at database level"
            })
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
          text: stringifyWithoutNulls({
            database: dbName,
            table_joins: tableJoins
          })
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

export async function getDistinctValuesHandler(args: any) {
  const { table, column, database } = args;
  const columns: string[] = Array.isArray(column) ? column : [column];

  try {
    const pool = getPool();
    const results: any[] = [];

    for (const col of columns) {
      let distinctQuery = `SELECT DISTINCT TOP 25 [${col}] FROM ${table}`;
      let countQuery = `SELECT COUNT(DISTINCT [${col}]) AS total_count FROM ${table}`;
      if (database) {
        distinctQuery = `USE [${database}]; ${distinctQuery}`;
        countQuery = `USE [${database}]; ${countQuery}`;
      }
      console.log(`Executing distinct query: ${distinctQuery}`);
      const distinctResult = await pool.request().query(distinctQuery);
      console.log(`Executing count query: ${countQuery}`);
      const countResult = await pool.request().query(countQuery);
      results.push({
        table,
        column: col,
        distinct_values: distinctResult.recordset.map((row: any) => row[col]),
        total_count: countResult.recordset[0].total_count
      });
    }

    return {
      content: [
        {
          type: "text",
          text: stringifyWithoutNulls(columns.length === 1 ? results[0] : results)
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
          text: `Error getting distinct values for column ${column} in table ${table}: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

// New specialized handler functions for BC_VLTS_DATA and AIM_KANEKA
export async function searchAssetsHandler(args: any) {
  const {
    keyword,
    asset_number,
    department,
    project_number,
    sap_equipment_number,
    asset_category,
    asset_class,
    asset_subclass,
    area,
    sub_area,
    functional_location,
    unit,
    process: processFilter,
    subprocess: subprocessFilter,
    in_workflow,
    include_retired = false,
    limit = 25
  } = args;

  // Cap limit at 25
  const cappedLimit = Math.min(limit, 25);

  try {
    const pool = getPool();
    let query = `SELECT TOP ${cappedLimit} * FROM [${assetDb}].[dbo].[${assetView}] WHERE 1=1`;

    // keyword searches across classification and process fields simultaneously
    if (keyword) {
      query += ` AND ([ASSET CATEGORY] LIKE @keyword OR [ASSET CLASS] LIKE @keyword OR [ASSET SUB CLASS] LIKE @keyword OR [FUNCTIONAL LOCATION] LIKE @keyword OR [UNIT] LIKE @keyword OR [PROCESS] LIKE @keyword OR [SUB PROCESS] LIKE @keyword)`;
    }

    // Use asset_number with LIKE pattern if provided
    if (asset_number) {
      query += ` AND [c_psAsset_Asset_Number_Check] LIKE @asset_number`;
    }

    if (department) {
      query += ` AND [DEPARTMENT] = @department`;
    }

    if (project_number) {
      query += ` AND [PROJECT NUMBER] LIKE @project_number`;
    }

    if (sap_equipment_number) {
      query += ` AND [SAP EQUIPMENT NUMBER] = @sap_equipment_number`;
    }

    if (asset_category) {
      query += ` AND [ASSET CATEGORY] = @asset_category`;
    }

    if (asset_class) {
      query += ` AND [ASSET CLASS] = @asset_class`;
    }

    if (asset_subclass) {
      query += ` AND [ASSET SUB CLASS] = @asset_subclass`;
    }

    if (area) {
      query += ` AND [AREA] LIKE @area`;
    }

    if (sub_area) {
      query += ` AND [SUB AREA] LIKE @sub_area`;
    }

    if (functional_location) {
      query += ` AND [FUNCTIONAL LOCATION] LIKE @functional_location`;
    }

    if (unit) {
      query += ` AND [UNIT] LIKE @unit`;
    }

    if (processFilter) {
      query += ` AND [PROCESS] LIKE @process`;
    }

    if (subprocessFilter) {
      query += ` AND [SUB PROCESS] LIKE @subprocess`;
    }

    if (in_workflow === true) {
      query += ` AND [c_psApproval_WFStateApproval] IS NOT NULL`;
    } else if (in_workflow === false) {
      query += ` AND ([c_psApproval_WFStateApproval] IS NULL OR [c_psApproval_WFStateApproval] = '')`;
    }

    if (!include_retired) {
      query += ` AND ([StateText] != 'Retired' OR [StateText] IS NULL)`;
    }

    const bindAssetParams = (req: any) => {
      if (keyword) req = req.input('keyword', `%${keyword}%`);
      if (asset_number) req = req.input('asset_number', `${asset_number.replace(/\s+/g, '')}%`);
      if (department) req = req.input('department', department);
      if (project_number) req = req.input('project_number', `%${project_number}%`);
      if (sap_equipment_number) req = req.input('sap_equipment_number', sap_equipment_number);
      if (asset_category) req = req.input('asset_category', asset_category);
      if (asset_class) req = req.input('asset_class', asset_class);
      if (asset_subclass) req = req.input('asset_subclass', asset_subclass);
      if (area) req = req.input('area', `%${area}%`);
      if (sub_area) req = req.input('sub_area', `%${sub_area}%`);
      if (functional_location) req = req.input('functional_location', `%${functional_location}%`);
      if (unit) req = req.input('unit', `%${unit}%`);
      if (processFilter) req = req.input('process', `%${processFilter}%`);
      if (subprocessFilter) req = req.input('subprocess', `%${subprocessFilter}%`);
      return req;
    };

    console.log(`Executing query: ${query}`);
    const result = await bindAssetParams(pool.request()).query(query);

    // Execute count query to get total results
    let countQuery = `SELECT COUNT(*) AS total_count FROM [${assetDb}].[dbo].[${assetView}] WHERE 1=1`;

    if (keyword) {
      countQuery += ` AND ([ASSET CATEGORY] LIKE @keyword OR [ASSET CLASS] LIKE @keyword OR [ASSET SUB CLASS] LIKE @keyword OR [FUNCTIONAL LOCATION] LIKE @keyword OR [UNIT] LIKE @keyword OR [PROCESS] LIKE @keyword OR [SUB PROCESS] LIKE @keyword)`;
    }

    // Use asset_number with LIKE pattern if provided
    if (asset_number) {
      countQuery += ` AND [c_psAsset_Asset_Number_Check] LIKE @asset_number`;
    }

    if (department) {
      countQuery += ` AND [DEPARTMENT] = @department`;
    }

    if (project_number) {
      countQuery += ` AND [PROJECT NUMBER] LIKE @project_number`;
    }

    if (sap_equipment_number) {
      countQuery += ` AND [SAP EQUIPMENT NUMBER] = @sap_equipment_number`;
    }

    if (asset_category) {
      countQuery += ` AND [ASSET CATEGORY] = @asset_category`;
    }

    if (asset_class) {
      countQuery += ` AND [ASSET CLASS] = @asset_class`;
    }

    if (asset_subclass) {
      countQuery += ` AND [ASSET SUB CLASS] = @asset_subclass`;
    }

    if (area) {
      countQuery += ` AND [AREA] LIKE @area`;
    }

    if (sub_area) {
      countQuery += ` AND [SUB AREA] LIKE @sub_area`;
    }

    if (functional_location) {
      countQuery += ` AND [FUNCTIONAL LOCATION] LIKE @functional_location`;
    }

    if (unit) {
      countQuery += ` AND [UNIT] LIKE @unit`;
    }

    if (processFilter) {
      countQuery += ` AND [PROCESS] LIKE @process`;
    }

    if (subprocessFilter) {
      countQuery += ` AND [SUB PROCESS] LIKE @subprocess`;
    }

    if (in_workflow === true) {
      countQuery += ` AND [c_psApproval_WFStateApproval] IS NOT NULL`;
    } else if (in_workflow === false) {
      countQuery += ` AND ([c_psApproval_WFStateApproval] IS NULL OR [c_psApproval_WFStateApproval] = '')`;
    }

    if (!include_retired) {
      countQuery += ` AND ([StateText] != 'Retired' OR [StateText] IS NULL)`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await bindAssetParams(pool.request()).query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} assets (total: ${totalCount}):\n${stringifyWithoutNulls(result.recordset)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error searching assets: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function searchProjectsHandler(args: any) {
  const { project_number, project_type, project_status = 'all', is_plant_environment, limit = 25 } = args;

  // Cap limit at 25
  const cappedLimit = Math.min(limit, 25);

  try {
    const pool = getPool();
    let query = `SELECT TOP ${cappedLimit} * FROM [${assetDb}].[dbo].[${projectView}] WHERE 1=1`;

    if (project_number) {
      query += ` AND [ProjectNumber] LIKE @project_number`;
    }

    if (project_type === 'RFE') {
      query += ` AND [ProjectNumber] LIKE 'RFE-%'`;
    }

    if (project_status === 'open') {
      query += ` AND [status] NOT IN ('Closed', 'discontinued')`;
    } else if (project_status === 'closed') {
      query += ` AND [status] IN ('Closed', 'discontinued')`;
    }

    if (is_plant_environment === true) {
      query += ` AND [ProjectNumber] = '-'`;
    } else if (is_plant_environment === false) {
      query += ` AND [ProjectNumber] != '-'`;
    }

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('project_number', project_number ? `%${project_number}%` : '')
      .query(query);

    // Execute count query to get total results
    let countQuery = `SELECT COUNT(*) AS total_count FROM [${assetDb}].[dbo].[${projectView}] WHERE 1=1`;

    if (project_number) {
      countQuery += ` AND [ProjectNumber] LIKE @project_number`;
    }

    if (project_type === 'RFE') {
      countQuery += ` AND [ProjectNumber] LIKE 'RFE-%'`;
    }

    if (project_status === 'open') {
      countQuery += ` AND [status] NOT IN ('Closed', 'discontinued')`;
    } else if (project_status === 'closed') {
      countQuery += ` AND [status] IN ('Closed', 'discontinued')`;
    }

    if (is_plant_environment === true) {
      countQuery += ` AND [ProjectNumber] = '-'`;
    } else if (is_plant_environment === false) {
      countQuery += ` AND [ProjectNumber] != '-'`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('project_number', project_number ? `%${project_number}%` : '')
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} projects (total: ${totalCount}):\n${stringifyWithoutNulls(result.recordset)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error searching projects: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function searchDocumentsHandler(args: any) {
  const {
    keyword,
    title,
    project_number,
    category,
    subcategory,
    vendor,
    department,
    reference_drawing,
    include_retired = false,
    is_plant_environment,
    limit = 25
  } = args;

  // Cap limit at 25
  const cappedLimit = Math.min(limit, 25);

  const buildConditions = (query: string, req: any): { query: string; req: any } => {
    // keyword searches across title AND subcategory (OR logic)
    if (keyword) {
      query += ` AND ([c_psDocument_DocumentTitle] LIKE @keyword OR [c_psDocument_DocumentSubC_0] LIKE @keyword OR [c_psDocument_DocumentCategory] LIKE @keyword)`;
    }

    if (title) {
      query += ` AND [c_psDocument_DocumentTitle] LIKE @title`;
    }

    if (project_number) {
      query += ` AND [ProjectNumber] LIKE @project_number`;
    }

    if (category) {
      query += ` AND [c_psDocument_DocumentCategory] = @category`;
    }

    if (subcategory) {
      query += ` AND [c_psDocument_DocumentSubC_0] LIKE @subcategory`;
    }

    if (vendor) {
      query += ` AND [c_psdocument_vendor] LIKE @vendor`;
    }

    if (department) {
      query += ` AND [c_Custom_Department] = @department`;
    }

    if (reference_drawing) {
      query += ` AND [c_psDocument_ReferenceDrawingN] LIKE @reference_drawing`;
    }

    if (!include_retired) {
      query += ` AND ([c_psApproval_WFStateApproval] != 'Retired' OR [c_psApproval_WFStateApproval] IS NULL)`;
    }

    if (is_plant_environment === true) {
      query += ` AND [c_psProject_ProjectNumber] = '-'`;
    } else if (is_plant_environment === false) {
      query += ` AND [c_psProject_ProjectNumber] != '-'`;
    }

    return { query, req };
  };

  try {
    const pool = getPool();
    let baseQuery = `SELECT TOP ${cappedLimit} * FROM [${documentDb}].[dbo].[${documentView}] WHERE 1=1`;
    let countBaseQuery = `SELECT COUNT(*) AS total_count FROM [${documentDb}].[dbo].[${documentView}] WHERE 1=1`;

    const { query } = buildConditions(baseQuery, null);
    const { query: countQuery } = buildConditions(countBaseQuery, null);

    const bindParams = (req: any) => {
      if (keyword) req = req.input('keyword', `%${keyword}%`);
      if (title) req = req.input('title', `%${title}%`);
      if (project_number) req = req.input('project_number', `%${project_number}%`);
      if (category) req = req.input('category', category);
      if (subcategory) req = req.input('subcategory', `%${subcategory}%`);
      if (vendor) req = req.input('vendor', `%${vendor}%`);
      if (department) req = req.input('department', department);
      if (reference_drawing) req = req.input('reference_drawing', `%${reference_drawing}%`);
      return req;
    };

    console.log(`Executing query: ${query}`);
    const result = await bindParams(pool.request()).query(query);

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await bindParams(pool.request()).query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} documents (total: ${totalCount}):\n${stringifyWithoutNulls(result.recordset)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error searching documents: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getAssetDetailsHandler(args: any) {
  const { asset_tag, sap_equipment_number, department } = args;

  // Validate that at least one identifier is provided
  if (!asset_tag && !sap_equipment_number) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one of asset_tag or sap_equipment_number must be provided"
        }
      ]
    };
  }

  try {
    const pool = getPool();
    let query = '';
    let request = pool.request();

    // Build query based on provided parameters
    const conditions = [];
    const params = [];

    if (asset_tag) {
      conditions.push("[c_psAsset_Asset_Number_Check] LIKE @asset_tag");
      request = request.input('asset_tag', `${asset_tag.replace(/\s+/g, '')}%`);
    }

    if (sap_equipment_number) {
      conditions.push("[SAP EQUIPMENT NUMBER] = @sap_equipment_number");
      request = request.input('sap_equipment_number', sap_equipment_number);
    }

    if (department) {
      request = request.input('department', department);
    }

    query = `SELECT * FROM [${assetDb}].[dbo].[${assetView}]
             WHERE ${conditions.join(' OR ')}`;

    if (department) {
      query += ` AND [DEPARTMENT] = @department`;
    }

    console.log(`Executing query: ${query}`);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      const searchCriteria = [];
      if (asset_tag) searchCriteria.push(`asset_tag: ${asset_tag}`);
      if (sap_equipment_number) searchCriteria.push(`sap_equipment_number: ${sap_equipment_number}`);

      return {
        content: [
          {
            type: "text",
            text: `No asset found with the provided criteria: ${searchCriteria.join(', ')}`
          }
        ]
      };
    }

    // If multiple results, return all of them
    if (result.recordset.length === 1) {
      return {
        content: [
          {
            type: "text",
            text: `Asset details:\n${stringifyWithoutNulls(result.recordset[0])}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Found ${result.recordset.length} assets matching the criteria:\n${stringifyWithoutNulls(result.recordset)}`
          }
        ]
      };
    }
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error getting asset details: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getProjectDetailsHandler(args: any) {
  const { project_number } = args;

  try {
    const pool = getPool();
    const query = `SELECT * FROM [${assetDb}].[dbo].[${projectView}]
                   WHERE [ProjectNumber] LIKE @project_number`;

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('project_number', `%${project_number}%`)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No project found with number: ${project_number}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Project details:\n${stringifyWithoutNulls(result.recordset[0])}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error getting project details: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getRelatedDocumentsForAssetHandler(args: any) {
  const { project_number = "-", asset_tag, sap_equipment_number, department, include_retired = false, limit = 25 } = args;

  // Cap limit at 25
  const cappedLimit = Math.min(limit, 25);

  try {
    const pool = getPool();

    // With default project_number of "-", we always have at least one search parameter

    let query = `
      SELECT TOP ${cappedLimit}
        d.[c_psDocument_DocumentTitle],
        d.[FileName],
        a.[Project Number],
        d.[c_psDocument_DocumentCategory],
        d.[c_psDocument_DocumentSubC_0],
        d.[c_psdocument_vendor],
        d.[c_psDocument_ReferenceDrawingN],
        d.[c_Custom_Department],
        a.[TAG NUMBER] as AssetTag,
        a.[SAP EQUIPMENT NUMBER] as SAPEquipmentNumber
      FROM [${documentDb}].[dbo].[${assetDocRefView}] r
      JOIN [${documentDb}].[dbo].[${documentView}] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [${assetDb}].[dbo].[${assetView}] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
      WHERE 1=1
    `;

    if (project_number) {
      query += ` AND a.[Project Number] LIKE @project_number`;
    }

    if (asset_tag) {
      query += ` AND a.[c_psAsset_Asset_Number_Check] LIKE @asset_tag`;
    }

    if (sap_equipment_number) {
      query += ` AND a.[SAP EQUIPMENT NUMBER] = @sap_equipment_number`;
    }

    if (department) {
      query += ` AND d.[c_Custom_Department] = @department`;
    }

    if (!include_retired) {
      query += ` AND (d.[c_psApproval_WFStateApproval] != 'Retired' OR d.[c_psApproval_WFStateApproval] IS NULL)`;
    }

    query += ` ORDER BY d.[FileName]`;

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('asset_tag', asset_tag ? `%${asset_tag.replace(/\s+/g, '')}%` : '')
      .input('sap_equipment_number', sap_equipment_number || '')
      .input('department', department || '')
      .query(query);

    // Execute count query to get total results
    let countQuery = `
      SELECT COUNT(*) AS total_count
      FROM [${documentDb}].[dbo].[${assetDocRefView}] r
      JOIN [${documentDb}].[dbo].[${documentView}] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [${assetDb}].[dbo].[${assetView}] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
      WHERE 1=1
    `;

    if (project_number) {
      countQuery += ` AND a.[Project Number] LIKE @project_number`;
    }

    if (asset_tag) {
      countQuery += ` AND a.[c_psAsset_Asset_Number_Check] LIKE @asset_tag`;
    }

    if (sap_equipment_number) {
      countQuery += ` AND a.[SAP EQUIPMENT NUMBER] = @sap_equipment_number`;
    }

    if (department) {
      countQuery += ` AND d.[c_Custom_Department] = @department`;
    }

    if (!include_retired) {
      countQuery += ` AND (d.[c_psApproval_WFStateApproval] != 'Retired' OR d.[c_psApproval_WFStateApproval] IS NULL)`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('asset_tag', asset_tag ? `%${asset_tag.replace(/\s+/g, '')}%` : '')
      .input('sap_equipment_number', sap_equipment_number || '')
      .input('department', department || '')
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} related documents (total: ${totalCount}):\n${stringifyWithoutNulls(result.recordset)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error getting related documents: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getAssetsForDocumentHandler(args: any) {
  const { document_title, file_name, department, include_retired = false, limit = 25 } = args;

  // Cap limit at 25
  const cappedLimit = Math.min(limit, 25);

  try {
    const pool = getPool();

    if (!document_title && !file_name) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Must provide either document_title or file_name"
          }
        ]
      };
    }

    let query = `
      SELECT TOP ${cappedLimit}
        a.[TAG NUMBER] as AssetTag,
        a.[SAP EQUIPMENT NUMBER] as SAPEquipmentNumber,
        a.[PROJECT NUMBER] as ProjectNumber,
        a.[ASSET CATEGORY] as AssetCategory,
        a.[ASSET CLASS] as AssetClass,
        a.[DEPARTMENT] as Department,
        d.[c_psDocument_DocumentTitle],
        d.[FileName],
        d.[c_psDocument_DocumentCategory],
        d.[c_psDocument_DocumentSubC_0],
        d.[c_Custom_Department]
      FROM [${documentDb}].[dbo].[${assetDocRefView}] r
      JOIN [${documentDb}].[dbo].[${documentView}] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [${assetDb}].[dbo].[${assetView}] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
      WHERE 1=1
    `;

    if (document_title) {
      query += ` AND d.[c_psDocument_DocumentTitle] LIKE @document_title`;
    }

    if (file_name) {
      query += ` AND d.[FileName] = @file_name`;
    }

    if (department) {
      query += ` AND d.[c_Custom_Department] = @department`;
    }

    if (!include_retired) {
      query += ` AND (d.[c_psApproval_WFStateApproval] != 'Retired' OR d.[c_psApproval_WFStateApproval] IS NULL)`;
    }

    query += ` ORDER BY a.[c_psAsset_Asset_Number_Check]`;

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('document_title', document_title ? `%${document_title}%` : '')
      .input('file_name', file_name || '')
      .input('department', department || '')
      .query(query);

    // Execute count query to get total results
    let countQuery = `
      SELECT COUNT(*) AS total_count
      FROM [${documentDb}].[dbo].[${assetDocRefView}] r
      JOIN [${documentDb}].[dbo].[${documentView}] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [${assetDb}].[dbo].[${assetView}] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
      WHERE 1=1
    `;

    if (document_title) {
      countQuery += ` AND d.[c_psDocument_DocumentTitle] LIKE @document_title`;
    }

    if (file_name) {
      countQuery += ` AND d.[FileName] = @file_name`;
    }

    if (department) {
      countQuery += ` AND d.[c_Custom_Department] = @department`;
    }

    if (!include_retired) {
      countQuery += ` AND (d.[c_psApproval_WFStateApproval] != 'Retired' OR d.[c_psApproval_WFStateApproval] IS NULL)`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('document_title', document_title ? `%${document_title}%` : '')
      .input('file_name', file_name || '')
      .input('department', department || '')
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} assets (total: ${totalCount}) related to the document:\n${stringifyWithoutNulls(result.recordset)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error getting assets for document: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}


export async function getDatabaseSchemaHandler(args: any) {
  const { database, include_views = true, include_tables = true } = args;

  try {
    const pool = getPool();
    let result = { tables: [], views: [] };

    if (include_tables) {
      const tablesQuery = `SELECT s.name AS schema_name, t.name AS table_name
                           FROM [${database}].sys.tables t
                           INNER JOIN [${database}].sys.schemas s ON t.schema_id = s.schema_id
                           ORDER BY s.name, t.name`;

      console.log(`Executing tables query: ${tablesQuery}`);
      const tablesResult = await pool.request().query(tablesQuery);
      result.tables = tablesResult.recordset;
    }

    if (include_views) {
      const viewsQuery = `SELECT s.name AS schema_name, v.name AS view_name
                          FROM [${database}].sys.views v
                          INNER JOIN [${database}].sys.schemas s ON v.schema_id = s.schema_id
                          ORDER BY s.name, v.name`;

      console.log(`Executing views query: ${viewsQuery}`);
      const viewsResult = await pool.request().query(viewsQuery);
      result.views = viewsResult.recordset;
    }

    return {
      content: [
        {
          type: "text",
          text: `Database schema for ${database}:\n${stringifyWithoutNulls(result)}`
        }
      ]
    };
  } catch (error) {
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.captureException(error);
    }
    return {
      content: [
        {
          type: "text",
          text: `Error getting database schema: ${error instanceof Error ? error.message : String(error)}`
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
  get_distinct_values: getDistinctValuesHandler,
  search_assets: searchAssetsHandler,
  search_projects: searchProjectsHandler,
  search_documents: searchDocumentsHandler,
  get_asset_details: getAssetDetailsHandler,
  get_project_details: getProjectDetailsHandler,
  get_related_documents_for_asset: getRelatedDocumentsForAssetHandler,
  get_assets_for_document: getAssetsForDocumentHandler,
  get_database_schema: getDatabaseSchemaHandler,
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
    const startedAt = Date.now();
    const targets = getToolTargets(name, args);

    logToolEvent('Tool call started', {
      tool: name,
      ...targets,
    });

    const result = await handler(args);

    logToolEvent('Tool call completed', {
      tool: name,
      durationMs: Date.now() - startedAt,
      ...targets,
    });

    return result;
  } catch (error) {
    logToolEvent('Tool call failed', {
      tool: name,
      error: error instanceof Error ? error.message : String(error),
      ...getToolTargets(name, args),
    });
    Sentry.captureException(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
