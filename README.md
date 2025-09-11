# MCP Server for On-Prem Database Access

This project implements a Model Context Protocol (MCP) server that provides secure access to on-premise MSSQL databases. It allows MCP clients to execute SQL queries, retrieve database metadata, and perform various database operations through a standardized protocol.

## Features

- **Database Tools**: Execute SQL queries, stored procedures, and retrieve metadata
- **Schema Exploration**: Get database schemas, tables, views, columns, and distinct values
- **Secure Authentication**: API key-based authentication for database access
- **Session Management**: HTTP-based transport with session handling
- **Error Monitoring**: Integrated Sentry for error tracking and performance monitoring
- **Docker Containerization**: Easy deployment in containerized environments

## Prerequisites

- Node.js 18+
- TypeScript
- Access to on-premise MSSQL database
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
DB_SERVER=your-db-server
DB_NAME=your-db-name
TRUST_CERT=false  # Set to true for self-signed certificates

# API Configuration
API_KEY=your-static-api-key
PORT=3000  # Optional, defaults to 3000

# Monitoring
SENTRY_DSN=your-sentry-dsn  # Optional, for error tracking
```

### Database Connection

The server connects to an MSSQL database using the `mssql` package. Ensure your database server allows connections from the server host.

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

### get_distinct_values
Get distinct values from a column, capped at 50 unique values, plus the total count.

**Parameters:**
- `table` (string): Fully qualified table name (schema.table)
- `column` (string): Column name
- `database` (string, optional): Database name (defaults to configured default)

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





