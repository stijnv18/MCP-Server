# MCP Server for On-Prem Database Access with Microsoft Copilot 365 Integration

This project implements a Model Context Protocol (MCP) server that provides secure access to on-premise databases with Microsoft Copilot 365 integration.

## Features

- **Database Tools**: Execute SQL queries against on-prem databases
- **Schema Exploration**: Get database table schemas and metadata
- **Microsoft Copilot Integration**: Leverage Copilot 365 for enhanced AI capabilities
- **Secure Authentication**: OAuth-based authentication for database access
- **Docker Containerization**: Easy deployment in containerized environments

## Prerequisites

- Node.js 18+
- TypeScript
- Access to on-premise database
- Microsoft Copilot 365 subscription (for integration features)

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

### Database Connection

Update the database connection settings in `src/index.ts`:

```typescript
// TODO: Implement actual database connection
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
```

### Microsoft Copilot Integration

Set up your Microsoft Copilot credentials:

```bash
export COPILOT_CLIENT_ID="your-client-id"
export COPILOT_CLIENT_SECRET="your-client-secret"
export COPILOT_TENANT_ID="your-tenant-id"
```

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

## Available Tools

### query_database
Execute SQL queries against the configured database.

**Parameters:**
- `query` (string): SQL query to execute
- `database` (string, optional): Database name (defaults to configured default)

### get_database_schema
Retrieve schema information for a database table.

**Parameters:**
- `table` (string): Table name to get schema for
- `database` (string, optional): Database name (defaults to configured default)

### microsoft_copilot_integration
Process data using Microsoft Copilot 365.

**Parameters:**
- `action` (string): Action to perform (analyze, summarize, generate)
- `data` (string): Data to process with Copilot

## Docker Deployment

This project includes a full Docker environment with MS SQL Server for testing.

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

1. Clone the repository
2. Copy the environment file:
   ```bash
   cp .env.example .env  # If you have .env.example, otherwise .env is already created
   ```
3. Start the services:
   ```bash
   docker-compose up --build
   ```

This will start:
- MS SQL Server on port 1433 with dummy data
- MCP Server on port 3000

### Services

- **sqlserver**: MS SQL Server with TestDB database and YourTable with 10 dummy records
- **mcp-server**: The MCP server application

### Environment Variables

Configure the following in `.env`:

```bash
# Database
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_SERVER=sqlserver
DB_NAME=TestDB

# API
API_KEY=test-api-key

# SSL
TRUST_CERT=true
```

### Testing the Server

Once running, you can test the MCP server:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

### Stopping the Environment

```bash
docker-compose down
```

## MCP Client Integration

This server can be used with any MCP-compatible client, including:

- Microsoft Copilot Studio
- Claude Desktop
- Custom MCP clients

### Configuration for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-server": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

## Security Considerations

- All database queries are logged for audit purposes
- Authentication is required for all operations
- Sensitive data is encrypted in transit and at rest
- Access controls are enforced at the database level

## Development

### Project Structure

```
src/
  index.ts          # Main entry point
  server.ts         # MCP server implementation
  config.ts         # Configuration and environment variables
  db.ts             # Database connection and pool management
  auth.ts           # Authentication logic
  tools.ts          # MCP tool handlers
dist/               # Compiled JavaScript
.vscode/
  mcp.json         # MCP configuration
.github/
  copilot-instructions.md  # Project documentation
Dockerfile          # Docker build file
docker-compose.yml  # Multi-service Docker setup
init-db.sql         # Database initialization script
.env               # Environment variables
```

### Adding New Tools

1. Define the tool in the `ListToolsRequestSchema` handler
2. Implement the tool logic in the `CallToolRequestSchema` handler
3. Add proper error handling and validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
