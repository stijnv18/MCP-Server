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

Build the Docker image:

```bash
docker build -t mcp-server-on-prem .
```

Run the container:

```bash
docker run -p 3000:3000 mcp-server-on-prem
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
  index.ts          # Main server implementation
dist/               # Compiled JavaScript
.vscode/
  mcp.json         # MCP configuration
.github/
  copilot-instructions.md  # Project documentation
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
