import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  InitializedNotificationSchema,
  ListToolsRequestSchema,
  McpError,
  isInitializeRequest,
} = require("@modelcontextprotocol/sdk/types.js");
const http = require('http');

import type { IncomingMessage, ServerResponse } from 'http';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { checkAuth } from './auth.js';
import { initDbPool, closeDbPool } from './db.js';
import { assetDb, assetDocRefView, assetView, dbConfig, documentDb, documentView, projectView, serviceName } from './config.js';
import { tools, handleToolCall } from './tools.js';

export class SimpleMcpServer {
  private server: any;

  private log(message: string, details?: Record<string, unknown>) {
    if (details) {
      console.error(`[${serviceName}] ${message}`, details);
      return;
    }

    console.error(`[${serviceName}] ${message}`);
  }

  constructor() {
    // Initialize Sentry only if DSN is provided and valid
    const sentryDsn = process.env.SENTRY_DSN || 'your-sentry-dsn-here';
    if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here') {
      Sentry.init({
        dsn: sentryDsn,
        integrations: [
          nodeProfilingIntegration(),
          Sentry.httpIntegration(),
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        environment: process.env.NODE_ENV || 'development',
      });
    }

    this.server = new Server(
      {
        name: "mcp-server",
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
    // Set up handlers for the main server instance
    this.setupToolHandlersForServer(this.server);
  }

  async run() {
    process.on('SIGINT', async () => {
      this.log('Closing DB pool...');
      await closeDbPool();
      process.exit(0);
    });

    // Store transports by session ID for session management
    const transports: { [sessionId: string]: any } = {};

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      this.log('Incoming HTTP request', {
        method: req.method || 'unknown',
        url: req.url || 'unknown',
        sessionId: (req.headers['mcp-session-id'] as string | undefined) || 'none',
      });

      Sentry.withScope((scope: any) => {
        scope.setTag('url', req.url || '');
        scope.setTag('method', req.method || '');
      });

      if (!checkAuth(req, res)) return;

      if (req.method === 'POST' && req.url === '/mcp') {
        try {
          // Read the request body
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const requestBody = JSON.parse(body);
              let transport: any;

              // Check for existing session ID
              const sessionId = req.headers['mcp-session-id'] as string | undefined;

              if (sessionId && transports[sessionId]) {
                // Reuse existing transport
                this.log('Reusing existing transport', { sessionId });
                transport = transports[sessionId];
              } else if (!sessionId && isInitializeRequest(requestBody)) {
                // New initialization request - create new server and transport
                this.log('Creating new transport for session initialization');
                const newServer = new Server(
                  {
                    name: "mcp-server",
                    version: "1.0.0",
                  },
                  {
                    capabilities: {
                      tools: {},
                    },
                  }
                );

                // Set up handlers for the new server
                this.setupToolHandlersForServer(newServer);

                transport = new StreamableHTTPServerTransport({
                  sessionIdGenerator: () => require('crypto').randomUUID(),
                  onsessioninitialized: (newSessionId: string) => {
                    this.log('Session initialized', { sessionId: newSessionId });
                    transports[newSessionId] = transport;
                  },
                  enableDnsRebindingProtection: false, // Disable for local development
                });

                                // Clean up transport when closed
                transport.onclose = () => {
                  this.log('Cleaning up transport', { sessionId: transport.sessionId || 'unknown' });
                  if (transport.sessionId) {
                    delete transports[transport.sessionId];
                  }
                };

                // Add error handling for transport
                transport.onerror = (error: any) => {
                  console.error(`[${serviceName}] Transport error for session ${transport.sessionId}:`, error);
                };

                // Connect the new server to the transport
                await newServer.connect(transport);
              } else {
                // Invalid request
                if (!res.headersSent) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: {
                      code: -32000,
                      message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                  }));
                }
                return;
              }

              // Handle the request
              await transport.handleRequest(req, res, requestBody);
            } catch (error) {
              console.error(`[${serviceName}] Request processing error:`, error);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: 'Internal server error',
                  },
                  id: null,
                }));
              }
            }
          });
        } catch (error) {
          console.error(`[${serviceName}] Request setup error:`, error);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end('Internal Server Error');
          }
        }
      } else if (req.method === 'GET' && req.url === '/mcp') {
        // Handle GET requests for server-to-client notifications via SSE
        this.log('Handling GET request for SSE', {
          sessionId: (req.headers['mcp-session-id'] as string | undefined) || 'none',
        });
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          if (!res.headersSent) {
            res.writeHead(400);
            res.end('Invalid or missing session ID');
          }
          return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      } else if (req.method === 'DELETE' && req.url === '/mcp') {
        // Handle DELETE requests for session termination
        this.log('Handling DELETE request for session termination', {
          sessionId: (req.headers['mcp-session-id'] as string | undefined) || 'none',
        });
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          if (!res.headersSent) {
            res.writeHead(400);
            res.end('Invalid or missing session ID');
          }
          return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      } else {
        if (!res.headersSent) {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      const address = server.address();
      const host = typeof address === 'string' ? address : address?.address || 'localhost';
      const maskedPassword = dbConfig.password ? '*'.repeat(dbConfig.password.length) : 'not set';

      this.log('MCP server started', {
        host,
        port,
        endpoint: '/mcp',
        nodeEnv: process.env.NODE_ENV || 'development',
      });
      this.log('Primary DB connection config', {
        database: dbConfig.database,
        server: dbConfig.server,
        user: dbConfig.user,
        password: maskedPassword,
      });
      this.log('Configured site data sources', {
        assetDb,
        assetView,
        projectView,
        documentDb,
        documentView,
        assetDocRefView,
      });
    });
  }

  private setupToolHandlersForServer(server: any) {
    // Handle initialize request
    server.setRequestHandler(InitializeRequestSchema, async (request: any) => {
      return {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "mcp-server",
          version: "1.0.0",
        },
      };
    });

    // Handle initialized notification
    server.setNotificationHandler(InitializedNotificationSchema, async () => {
      // Client is initialized, we can start accepting tool calls
      this.log('MCP client initialized successfully');
    });

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      return await handleToolCall(name, args);
    });
  }
}
