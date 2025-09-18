# Commands to update container
git pull
docker compose -p more-tools build
docker compose -p more-tools up -d


# MCP Server for On-Prem Database Access

This project implements a Model Context Protocol (MCP) server that provides secure access to on-premise MSSQL databases at kgaprd-sql.gkaneka.local. It allows MCP clients to execute SQL queries, retrieve database metadata, and perform various database operations through a standardized protocol.

## Features

- **Database Tools**: Execute SQL queries, stored procedures, and retrieve metadata
- **Schema Exploration**: Get database schemas, tables, views, columns, and distinct values
- **Asset & Project Management**: Search and retrieve assets and projects from BC_VLTS_DATA
- **Document Management**: Search and retrieve documents from AIM_KANEKA
- **Relationship Queries**: Find relationships between assets, projects, and documents
- **Secure Authentication**: API key-based authentication for database access
- **Session Management**: HTTP-based transport with session handling
- **Error Monitoring**: Integrated Sentry for error tracking and performance monitoring
- **Docker Containerization**: Easy deployment in containerized environments

## Prerequisites

- Node.js 18+
- TypeScript
- Access to on-premise MSSQL database at kgaprd-sql.gkaneka.local
- Docker and Docker Compose (for containerized deployment)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

Set the following environment variables:

```bash
# Database Configuration
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SERVER=kgaprd-sql.gkaneka.local
DB_NAME=your-db-name
TRUST_CERT=false  # Set to true for self-signed certificates

# API Configuration
API_KEY=your-static-api-key
PORT=3000  # Optional, defaults to 3000

# Monitoring
SENTRY_DSN=your-sentry-dsn  # Optional, for error tracking
```

### Database Connection

The server connects to MSSQL databases at kgaprd-sql.gkaneka.local using the `mssql` package. The server provides access to two main databases:
- **BC_VLTS_DATA**: Asset and project information
- **AIM_KANEKA**: Document management and asset-document relationships

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server will start on the specified port (default 3000) and listen for MCP requests at `/mcp` endpoint.

## Available Tools

### get_databases
Get a list of all databases on the server.

**Parameters:** None

### get_tables
Get a list of all tables in the specified database, organized by schema.

**Parameters:**
- `database` (string, optional): Database name (defaults to configured default)

### get_list_views
Get a list of all views in the specified database, organized by schema.

**Parameters:**
- `database` (string, optional): Database name (defaults to configured default)

### get_columns
Get column information for a specific table or view.

**Parameters:**
- `table` (string): Fully qualified table name (schema.table)
- `database` (string, optional): Database name (defaults to configured default)

### run_sql
Execute any SQL command on the database.

**Parameters:**
- `query` (string): SQL query to execute

### execute_stored_procedure
Execute a stored procedure with parameters.

**Parameters:**
- `procedure` (string): Stored procedure name
- `parameters` (array, optional): Array of parameter objects with `name` and `value`
- `database` (string, optional): Database name (defaults to configured default)

### get_table_joins
Get join information from 'Joins' extended property on tables.

**Parameters:**
- `table` (string, optional): Specific table name (if not provided, returns joins for all tables)
- `database` (string): Database name

### get_database_schema
Get schema information for specific databases (BC_VLTS_DATA or AIM_KANEKA).

**Parameters:**
- `database` (string): Database name (BC_VLTS_DATA or AIM_KANEKA)
- `include_views` (boolean, optional): Include views in schema (default: true)
- `include_tables` (boolean, optional): Include tables in schema (default: true)

### search_assets
Search for assets in BC_VLTS_DATA.BCAssetPropertiesViewByNameBCE with various filters.

**Parameters:**
- `tag_type` (string, optional): Asset tag type (e.g., 'V', 'P', 'T')
- `sequence_number` (string, optional): Asset sequence number (e.g., '2210 H')
- `department` (string, optional): 3-character department code (MOD, EPE, MSE, SUP)
- `project_number` (string, optional): Project number to filter assets
- `sap_equipment_number` (string, optional): SAP equipment number
- `include_retired` (boolean, optional): Include retired/decommissioned assets (default: false)
- `limit` (number, optional): Maximum number of results (default: 50)

### search_projects
Search for projects in BC_VLTS_DATA.ProjectPropertiesView.

**Parameters:**
- `project_number` (string, optional): Project number (supports partial matching)
- `project_type` (string, optional): Filter by type ('RFE' for investments, 'all' for all)
- `project_state` (string, optional): Filter by state ('open' for active, 'closed' for completed, 'all' for all)
- `is_plant_environment` (boolean, optional): Filter for plant/as-built environment projects ([PROJECT NUMBER]='-')
- `limit` (number, optional): Maximum number of results (default: 50)

### search_documents
Search for documents in AIM_KANEKA DocumentPropertiesViewCoPilot.

**Parameters:**
- `title` (string, optional): Document title to search for ([c_psDocument_DocumentTitle])
- `project_number` (string, optional): Project number associated with documents
- `category` (string, optional): Document category ([c_psDocument_DocumentCategory]) - PID, INV, COM, LAY, etc.
- `subcategory` (string, optional): Document subcategory ([c_psDocument_DocumentSubC_0])
- `vendor` (string, optional): Vendor information ([c_psdocument_vendor])
- `reference_drawing` (string, optional): Reference drawing number ([c_psDocumentReferenceDrawingN])
- `include_retired` (boolean, optional): Include retired documents (default: false)
- `is_plant_environment` (boolean, optional): Filter for plant/as-built environment documents
- `limit` (number, optional): Maximum number of results (default: 50)

### get_asset_details
Get detailed asset information by tag number or SAP equipment number.

**Parameters:**
- `identifier` (string): Asset identifier (tag number like 'V 2210 H EPE' or SAP equipment number)
- `identifier_type` (string, optional): Type of identifier ('tag_number' or 'sap_equipment')

### get_project_details
Get detailed project information by project number.

**Parameters:**
- `project_number` (string): Project number to get details for

### get_related_assets
Get all assets related to a specific project.

**Parameters:**
- `project_number` (string): Project number to find related assets for
- `include_retired` (boolean, optional): Include retired assets (default: false)
- `limit` (number, optional): Maximum number of results (default: 100)

### get_related_documents
Get documents related to a specific project or asset using AssetDocRefViewCoPilot.

**Parameters:**
- `project_number` (string, optional): Project number to find related documents for
- `asset_tag` (string, optional): Asset tag to find related documents for
- `include_retired` (boolean, optional): Include retired documents/assets (default: false)
- `limit` (number, optional): Maximum number of results (default: 50)

### get_assets_for_document
Get assets related to a specific document using AssetDocRefViewCoPilot.

**Parameters:**
- `document_title` (string, optional): Document title to find related assets for
- `file_name` (string, optional): File name to find related assets for
- `include_retired` (boolean, optional): Include retired assets (default: false)
- `limit` (number, optional): Maximum number of results (default: 50)

### validate_asset_tag
Validate and parse an asset tag number into its components.

**Parameters:**
- `tag_number` (string): Complete asset tag number (e.g., 'V 2210 H EPE')

## Docker Deployment

The project includes Docker support for easy deployment.

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

1. Clone the repository
2. Configure environment variables in `.env` file
3. Start the services:
   ```bash
   docker-compose up --build
   ```

This will start the MCP server in a container.

### Environment Variables for Docker

```bash
# Database
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SERVER=your-db-server
DB_NAME=your-db-name
TRUST_CERT=false

# API
API_KEY=your-api-key
PORT=3000

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## MCP Client Integration

This server can be used with any MCP-compatible client.

### Configuration for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-server": {
      "command": "node",
      "args": ["/path/to/project/dist/index.js"]
    }
  }
}
```

### Testing the Server

You can test the server using curl:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

## Security Considerations

- Authentication is required for all operations using Bearer token
- Database credentials are stored securely as environment variables
- All queries are logged for audit purposes
- Sensitive data should be handled according to your organization's security policies

## Development

### Project Structure

```
src/
  index.ts          # Main entry point
  server.ts         # MCP server implementation with HTTP transport
  config.ts         # Configuration and environment variables
  db.ts             # Database connection pool management
  auth.ts           # API key authentication
  tools.ts          # MCP tool definitions and handlers
dist/               # Compiled JavaScript output
Dockerfile          # Docker build configuration
docker-compose.yml  # Multi-service Docker setup
```

### Adding New Tools

1. Define the tool schema in the `tools` array in `tools.ts`
2. Implement the handler function
3. Add the handler to the `toolHandlers` map
4. Update the `handleToolCall` function if needed

### Building and Running

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Clean build artifacts
npm run clean
```

## Monitoring and Logging

The server integrates with Sentry for error tracking and performance monitoring. Configure `SENTRY_DSN` to enable.

All database operations are logged to the console for debugging and audit purposes.





