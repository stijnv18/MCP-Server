import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");
const http = require('http');

import type { IncomingMessage, ServerResponse } from 'http';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { checkAuth } from './auth.js';
import { initDbPool, closeDbPool } from './db.js';
import { handleGetBasicInfo } from './tools.js';

export class SimpleMcpServer {
  private server: any;

  constructor() {
    // Initialize Sentry
    Sentry.init({
      dsn: process.env.SENTRY_DSN || 'your-sentry-dsn-here',
      integrations: [
        nodeProfilingIntegration(),
        Sentry.httpIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development',
    });

    this.server = new Server(
      {
        name: "mcp-server-one-file",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    initDbPool();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_basic_info":
            return await handleGetBasicInfo(args);
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
    });
  }

  async run() {
    process.on('SIGINT', async () => {
      console.error('Closing DB pool...');
      await closeDbPool();
      process.exit(0);
    });

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      Sentry.withScope((scope: any) => {
        scope.setTag('url', req.url || '');
        scope.setTag('method', req.method || '');
      });

      if (!checkAuth(req, res)) return;

      if (req.method === 'POST' && req.url === '/mcp') {
        try {
          const transport = new StreamableHTTPServerTransport(res);
          await this.server.connect(transport);
        } catch (error) {
          console.error('Streamable connection error:', error);
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.error(`MCP Server running on HTTP port ${port} with /mcp endpoint`);
    });
  }
}
