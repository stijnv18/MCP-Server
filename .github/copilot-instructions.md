# MCP Server Project Instructions

This is a Model Context Protocol (MCP) server project for secure on-premise MSSQL database access.

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

## Environment Variables

Required environment variables:
- `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`: Database connection
- `API_KEY`: For authentication
- `SENTRY_DSN`: For error monitoring (optional)
- `PORT`: Server port (default 3000)

## Development Guidelines

- Use TypeScript for all new code
- Follow MCP protocol specifications
- Implement proper error handling with Sentry
- Log all database operations
- Use connection pooling for database access
- Validate all inputs and handle authentication

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
