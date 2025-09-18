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
    name: "search_assets",
    description: "Search for assets in BC_VLTS_DATA.BCAssetPropertiesViewByNameBCE with various filters",
    inputSchema: {
      type: "object",
      properties: {
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
          description: "Maximum number of results to return (default: 50)",
          default: 50
        }
      }
    }
  },
  {
    name: "search_projects",
    description: "Search for projects in BC_VLTS_DATA.ProjectPropertiesView",
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
          description: "Maximum number of results to return (default: 50)",
          default: 50
        }
      }
    }
  },
  {
    name: "search_documents",
    description: "Search for documents in AIM_KANEKA DocumentPropertiesViewCoPilot",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Document title to search for ([c_psDocument_DocumentTitle])"
        },
        project_number: {
          type: "string",
          description: "Project number associated with documents"
        },
        category: {
          type: "string",
          description: "Document category ([c_psDocument_DocumentCategory]) - PID, INV, COM, LAY, etc."
        },
        subcategory: {
          type: "string",
          description: "Document subcategory ([c_psDocument_DocumentSubC_0])"
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
          description: "Include retired/decommissioned documents ([c_psDocument_documentAsBuiltSt]='Retired'). Default is false",
          default: false
        },
        is_plant_environment: {
          type: "boolean",
          description: "Filter for plant/as-built environment documents ([c_psProject_ProjectNumber]='-')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 50)",
          default: 50
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
    name: "get_related_assets",
    description: "Get all assets related to a specific project",
    inputSchema: {
      type: "object",
      properties: {
        project_number: {
          type: "string",
          description: "Project number to find related assets for"
        },
        include_retired: {
          type: "boolean",
          description: "Include retired/decommissioned assets (default: false)",
          default: false
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 100)",
          default: 100
        }
      },
      required: ["project_number"]
    }
  },
  {
    name: "get_assets_for_document",
    description: "Get assets related to a specific document using AssetDocRefViewCoPilot",
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
          description: "Maximum number of results to return (default: 50)",
          default: 50
        }
      }
    }
  },
  {
    name: "get_related_documents",
    description: "Get documents related to a specific project or asset using AssetDocRefViewCoPilot",
    inputSchema: {
      type: "object",
      properties: {
        project_number: {
          type: "string",
          description: "Project number to find related documents for"
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
          description: "Maximum number of results to return (default: 50)",
          default: 50
        }
      }
    }
  },
  {
    name: "get_database_schema",
    description: "Get schema information for specific databases (BC_VLTS_DATA or AIM_KANEKA)",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "Database name",
          enum: ["BC_VLTS_DATA", "AIM_KANEKA"]
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

export async function getDistinctValuesHandler(args: any) {
  const { table, column, database } = args;

  try {
    const pool = getPool();
    let distinctQuery = `SELECT DISTINCT TOP 50 [${column}] FROM ${table}`;
    let countQuery = `SELECT COUNT(DISTINCT [${column}]) AS total_count FROM ${table}`;
    if (database) {
      distinctQuery = `USE [${database}]; ${distinctQuery}`;
      countQuery = `USE [${database}]; ${countQuery}`;
    }
    console.log(`Executing distinct query: ${distinctQuery}`);
    const distinctResult = await pool.request().query(distinctQuery);
    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request().query(countQuery);
    const distinctValues = distinctResult.recordset.map((row: any) => row[column]);
    const totalCount = countResult.recordset[0].total_count;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            table: table,
            column: column,
            distinct_values: distinctValues,
            total_count: totalCount
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
          text: `Error getting distinct values for column ${column} in table ${table}: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

// New specialized handler functions for BC_VLTS_DATA and AIM_KANEKA
export async function searchAssetsHandler(args: any) {
  const {
    asset_number,
    department,
    project_number,
    sap_equipment_number,
    asset_category,
    asset_class,
    asset_subclass,
    functional_location,
    unit,
    process,
    subprocess,
    in_workflow,
    include_retired = false,
    limit = 50
  } = args;

  try {
    const pool = getPool();
    let query = `SELECT TOP ${limit} * FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] WHERE 1=1`;

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

    if (functional_location) {
      query += ` AND [FUNCTIONAL LOCATION] LIKE @functional_location`;
    }

    if (unit) {
      query += ` AND [UNIT] LIKE @unit`;
    }

    if (process) {
      query += ` AND [PROCESS] LIKE @process`;
    }

    if (subprocess) {
      query += ` AND [SUB PROCESS] LIKE @subprocess`;
    }

    if (in_workflow === true) {
      query += ` AND [c_psApproval_WFStateApproval] IS NOT NULL`;
    } else if (in_workflow === false) {
      query += ` AND [c_psApproval_WFStateApproval] IS NULL`;
    }

    if (!include_retired) {
      query += ` AND [c_psAsset_AsBuiltStatus] != 'retired'`;
    }

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('asset_number', asset_number ? `%${asset_number.replace(/\s+/g, '')}%` : '')
      .input('department', department || '')
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('sap_equipment_number', sap_equipment_number || '')
      .input('asset_category', asset_category || '')
      .input('asset_class', asset_class || '')
      .input('asset_subclass', asset_subclass || '')
      .input('functional_location', functional_location ? `%${functional_location}%` : '')
      .input('unit', unit ? `%${unit}%` : '')
      .input('process', process ? `%${process}%` : '')
      .input('subprocess', subprocess ? `%${subprocess}%` : '')
      .query(query);

    // Execute count query to get total results
    let countQuery = `SELECT COUNT(*) AS total_count FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] WHERE 1=1`;

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

    if (functional_location) {
      countQuery += ` AND [FUNCTIONAL LOCATION] LIKE @functional_location`;
    }

    if (unit) {
      countQuery += ` AND [UNIT] LIKE @unit`;
    }

    if (process) {
      countQuery += ` AND [PROCESS] LIKE @process`;
    }

    if (subprocess) {
      countQuery += ` AND [SUB PROCESS] LIKE @subprocess`;
    }

    if (in_workflow === true) {
      countQuery += ` AND [c_psApproval_WFStateApproval] IS NOT NULL`;
    } else if (in_workflow === false) {
      countQuery += ` AND [c_psApproval_WFStateApproval] IS NULL`;
    }

    if (!include_retired) {
      countQuery += ` AND [c_psAsset_AsBuiltStatus] != 'retired'`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('asset_number', asset_number ? `%${asset_number.replace(/\s+/g, '')}%` : '')
      .input('department', department || '')
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('sap_equipment_number', sap_equipment_number || '')
      .input('asset_category', asset_category || '')
      .input('asset_class', asset_class || '')
      .input('asset_subclass', asset_subclass || '')
      .input('functional_location', functional_location ? `%${functional_location}%` : '')
      .input('unit', unit ? `%${unit}%` : '')
      .input('process', process ? `%${process}%` : '')
      .input('subprocess', subprocess ? `%${subprocess}%` : '')
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} assets (total: ${totalCount}):\n${JSON.stringify(result.recordset, null, 2)}`
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
  const { project_number, project_type, project_status = 'all', is_plant_environment, limit = 50 } = args;

  try {
    const pool = getPool();
    let query = `SELECT TOP ${limit} * FROM [BC_VLTS_DATA].[dbo].[ProjectPropertiesView] WHERE 1=1`;

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
    let countQuery = `SELECT COUNT(*) AS total_count FROM [BC_VLTS_DATA].[dbo].[ProjectPropertiesView] WHERE 1=1`;

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
          text: `Found ${result.recordset.length} projects (total: ${totalCount}):\n${JSON.stringify(result.recordset, null, 2)}`
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
    title,
    project_number,
    category,
    subcategory,
    vendor,
    department,
    reference_drawing,
    include_retired = false,
    is_plant_environment,
    limit = 50
  } = args;

  try {
    const pool = getPool();
    let query = `SELECT TOP ${limit} * FROM [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] WHERE 1=1`;

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
      query += ` AND [c_psDocument_documentAsBuiltSt] != 'Retired'`;
    }

    if (is_plant_environment === true) {
      query += ` AND [c_psProject_ProjectNumber] = '-'`;
    } else if (is_plant_environment === false) {
      query += ` AND [c_psProject_ProjectNumber] != '-'`;
    }

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('title', title ? `%${title}%` : '')
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('category', category || '')
      .input('subcategory', subcategory ? `%${subcategory}%` : '')
      .input('vendor', vendor ? `%${vendor}%` : '')
      .input('department', department || '')
      .input('reference_drawing', reference_drawing ? `%${reference_drawing}%` : '')
      .query(query);

    // Execute count query to get total results
    let countQuery = `SELECT COUNT(*) AS total_count FROM [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] WHERE 1=1`;

    if (title) {
      countQuery += ` AND [c_psDocument_DocumentTitle] LIKE @title`;
    }

    if (project_number) {
      countQuery += ` AND [ProjectNumber] LIKE @project_number`;
    }

    if (category) {
      countQuery += ` AND [c_psDocument_DocumentCategory] = @category`;
    }

    if (subcategory) {
      countQuery += ` AND [c_psDocument_DocumentSubC_0] LIKE @subcategory`;
    }

    if (vendor) {
      countQuery += ` AND [c_psdocument_vendor] LIKE @vendor`;
    }

    if (department) {
      countQuery += ` AND [c_Custom_Department] = @department`;
    }

    if (reference_drawing) {
      countQuery += ` AND [c_psDocument_ReferenceDrawingN] LIKE @reference_drawing`;
    }

    if (!include_retired) {
      countQuery += ` AND [c_psDocument_documentAsBuiltSt] != 'Retired'`;
    }

    if (is_plant_environment === true) {
      countQuery += ` AND [c_psProject_ProjectNumber] = '-'`;
    } else if (is_plant_environment === false) {
      countQuery += ` AND [c_psProject_ProjectNumber] != '-'`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('title', title ? `%${title}%` : '')
      .input('project_number', project_number ? `%${project_number}%` : '')
      .input('category', category || '')
      .input('subcategory', subcategory ? `%${subcategory}%` : '')
      .input('vendor', vendor ? `%${vendor}%` : '')
      .input('department', department || '')
      .input('reference_drawing', reference_drawing ? `%${reference_drawing}%` : '')
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} documents (total: ${totalCount}):\n${JSON.stringify(result.recordset, null, 2)}`
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
  const { asset_tag, sap_equipment_number } = args;

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
      request = request.input('asset_tag', `%${asset_tag.replace(/\s+/g, '')}%`);
    }

    if (sap_equipment_number) {
      conditions.push("[SAP EQUIPMENT NUMBER] = @sap_equipment_number");
      request = request.input('sap_equipment_number', sap_equipment_number);
    }

    query = `SELECT * FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE]
             WHERE ${conditions.join(' OR ')}`;

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
            text: `Asset details:\n${JSON.stringify(result.recordset[0], null, 2)}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `Found ${result.recordset.length} assets matching the criteria:\n${JSON.stringify(result.recordset, null, 2)}`
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
    const query = `SELECT * FROM [BC_VLTS_DATA].[dbo].[ProjectPropertiesView]
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
          text: `Project details:\n${JSON.stringify(result.recordset[0], null, 2)}`
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

export async function getRelatedAssetsHandler(args: any) {
  const { project_number, include_retired = false, limit = 100 } = args;

  try {
    const pool = getPool();
    let query = `SELECT TOP ${limit} * FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE]
                 WHERE [PROJECT NUMBER] LIKE @project_number`;

    if (!include_retired) {
      query += ` AND [c_psDocument_documentAsBuiltSt] != 'retired'`;
    }

    console.log(`Executing query: ${query}`);
    const result = await pool.request()
      .input('project_number', `%${project_number}%`)
      .query(query);

    // Execute count query to get total results
    let countQuery = `SELECT COUNT(*) AS total_count FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE]
                      WHERE [PROJECT NUMBER] LIKE @project_number`;

    if (!include_retired) {
      countQuery += ` AND [c_psDocument_documentAsBuiltSt] != 'retired'`;
    }

    console.log(`Executing count query: ${countQuery}`);
    const countResult = await pool.request()
      .input('project_number', `%${project_number}%`)
      .query(countQuery);

    const totalCount = countResult.recordset[0].total_count;

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.recordset.length} assets (total: ${totalCount}) related to project ${project_number}:\n${JSON.stringify(result.recordset, null, 2)}`
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
          text: `Error getting related assets: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export async function getRelatedDocumentsHandler(args: any) {
  const { project_number, asset_tag, sap_equipment_number, department, include_retired = false, limit = 50 } = args;

  try {
    const pool = getPool();

    if (!project_number && !asset_tag && !sap_equipment_number) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Must provide either project_number, asset_tag, or sap_equipment_number"
          }
        ]
      };
    }

    let query = `
      SELECT TOP ${limit}
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
      FROM [AIM_KANEKA].[dbo].[AssetDocRefViewCoPilot] r
      JOIN [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
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
      query += ` AND d.[c_psDocument_DocumentAsBuiltSt] != 'Retired'`;

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
      FROM [AIM_KANEKA].[dbo].[AssetDocRefViewCoPilot] r
      JOIN [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
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
      countQuery += ` AND d.[c_psDocument_documentAsBuiltSt] != 'Retired'`;
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
          text: `Found ${result.recordset.length} related documents (total: ${totalCount}):\n${JSON.stringify(result.recordset, null, 2)}`
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
  const { document_title, file_name, department, include_retired = false, limit = 50 } = args;

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
      SELECT TOP ${limit}
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
      FROM [AIM_KANEKA].[dbo].[AssetDocRefViewCoPilot] r
      JOIN [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
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
      query += ` AND d.[c_psDocument_DocumentAsBuiltSt] != 'Retired'`;
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
      FROM [AIM_KANEKA].[dbo].[AssetDocRefViewCoPilot] r
      JOIN [AIM_KANEKA].[dbo].[DocumentPropertiesViewCoPilot] d ON r.DocumentRevisionID = d.DocumentRevisionID
      JOIN [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE] a ON r.[ObjectTagRevisionID] = a.[ObjectTagRevisionID]
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
      countQuery += ` AND d.[c_psDocument_DocumentAsBuiltSt] != 'Retired'`;
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
          text: `Found ${result.recordset.length} assets (total: ${totalCount}) related to the document:\n${JSON.stringify(result.recordset, null, 2)}`
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
          text: `Database schema for ${database}:\n${JSON.stringify(result, null, 2)}`
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
  get_related_assets: getRelatedAssetsHandler,
  get_related_documents: getRelatedDocumentsHandler,
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
    return await handler(args);
  } catch (error) {
    Sentry.captureException(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
