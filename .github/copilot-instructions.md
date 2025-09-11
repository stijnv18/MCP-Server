# MCP Server Project Instructions

This is a Model Context Protocol (MCP) server project for secure on-premise MSSQL database access with specialized support for BC_VLTS_DATA and AIM_KANEKA databases.

## Project Overview

- **Type**: MCP Server
- **Language**: TypeScript
- **Framework**: Node.js with @modelcontextprotocol/sdk
- **Database**: MSSQL (on-premise)
- **Authentication**: API key-based
- **Transport**: HTTP with session management
- **Monitoring**: Sentry integration

## Key Components

- `src/index.ts`: Main entry point
- `src/server.ts`: MCP server implementation with HTTP transport
- `src/tools.ts`: MCP tool definitions and handlers
- `src/db.ts`: Database connection pool management
- `src/auth.ts`: API key authentication
- `src/config.ts`: Configuration and environment variables

## Available Tools

The server provides these MCP tools:
- `get_databases`: List all databases
- `get_tables`: Get tables by schema
- `get_list_views`: Get views by schema
- `get_columns`: Get column info for a table
- `run_sql`: Execute SQL queries
- `execute_stored_procedure`: Run stored procedures
- `get_table_joins`: Get join information from extended properties
- `get_distinct_values`: Get distinct values from a column

### Specialized Database Tools

- `search_assets`: Search assets in BC_VLTS_DATA with business rules
- `search_projects`: Search projects with RFE investment filtering
- `search_documents`: Search documents in AIM_KANEKA with column filtering
- `get_asset_details`: Get asset details by tag or SAP number
- `get_project_details`: Get project details with partial matching
- `get_related_assets`: Get assets for a specific project
- `get_related_documents`: Get documents for projects/assets
- `validate_asset_tag`: Parse and validate asset tag format
- `get_database_schema`: Get schema for BC_VLTS_DATA or AIM_KANEKA

## Environment Variables

Required environment variables:
- `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`: Database connection
- `API_KEY`: For authentication
- `SENTRY_DSN`: For error monitoring (optional)
- `PORT`: Server port (default 3000)

## Database-Specific Instructions

### BC_VLTS_DATA Database

#### Asset Management
- **Primary View**: `BCAssetPropertiesViewByNameBCE` - Contains all asset properties
- **Asset Identification**: 
  - Uniqueness determined by `[SAP EQUIPMENT NUMBER]` + `[PROJECT NUMBER]`
  - Tag format: `[TAG TYPE]` + " " + `[SEQUENCE NUMBER]` + " " + `[DEPARTMENT]`
  - Example: "V 2210 H EPE" = "V" + " " + "2210 H" + " " + "EPE"
- **Departments**: Always 3 characters (MOD, EPE, MSE, SUP)
- **Asset Status**: Assets with `status='retired'` are decommissioned and should be excluded unless explicitly requested

#### Project Management
- **Primary View**: `ProjectPropertiesView` - Contains all project information
- **Project Types**: Projects starting with "RFE-" are investments
- **Project Lookup**: Use `LIKE '%[project_number]%'` for partial matching
- **Asset-Project Relationship**: Join on `PROJECT NUMBER` field

### AIM_KANEKA Database

#### Document Management
- **Primary Tables**: `documentRevisionCustom` and `documentRevisionCustom1`
- **Key Field**: `[c_psDocument_DocumentTitle]` - Most commonly queried field
- **Column Filtering**: Automatically exclude columns starting with:
  - `c_Custom*` (custom fields)
  - `c_PsChem*` (chemical-specific fields)
- **Join Information**: Use `get_table_joins` to read join relationships from extended properties

### Query Patterns

#### Asset Search Examples
```sql
-- Find asset by tag components
SELECT * FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE]
WHERE [TAG TYPE] = 'V'
  AND [SEQUENCE NUMBER] = '2210 H'
  AND [DEPARTMENT] = 'EPE'
  AND [STATUS] != 'retired'

-- Find assets by project
SELECT * FROM [BC_VLTS_DATA].[dbo].[BCAssetPropertiesViewByNameBCE]
WHERE [PROJECT NUMBER] LIKE '%1357%'
  AND [STATUS] != 'retired'
```

#### Project Search Examples
```sql
-- Find investment projects
SELECT * FROM [BC_VLTS_DATA].[dbo].[ProjectPropertiesView]
WHERE [ProjectNumber] LIKE 'RFE-%'

-- Find project by partial number
SELECT * FROM [BC_VLTS_DATA].[dbo].[ProjectPropertiesView]
WHERE [ProjectNumber] LIKE '%1357%'
```

#### Document Search Examples
```sql
-- Search documents by title
SELECT [c_psDocument_DocumentTitle], [ProjectNumber], *
FROM [AIM_KANEKA].[dbo].[documentRevisionCustom]
WHERE [c_psDocument_DocumentTitle] LIKE '%search_term%'
  AND [ProjectNumber] LIKE '%project%'

-- Exclude unwanted columns
SELECT * FROM [AIM_KANEKA].[dbo].[documentRevisionCustom]
WHERE NOT (COLUMN_NAME LIKE 'c_Custom%' OR COLUMN_NAME LIKE 'c_PsChem%')
```

## Development Guidelines

- Use TypeScript for all new code
- Follow MCP protocol specifications
- Implement proper error handling with Sentry
- Log all database operations
- Use connection pooling for database access
- Validate all inputs and handle authentication
- Apply business rules consistently (retired asset filtering, RFE project types, etc.)

## Building and Running

```bash
npm install
npm run build
npm start
```

For development:
```bash
npm run dev
```

## Docker Support

The project includes Docker configuration for containerized deployment.

## Security Notes

- All requests require Bearer token authentication
- Database credentials stored as environment variables
- Queries are logged for audit purposes
- Use HTTPS in production
