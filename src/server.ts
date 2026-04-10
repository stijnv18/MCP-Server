import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const {
  CallToolRequestSchema,
  ErrorCode,
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

    // Transport map is shared across all requests in this HTTP server instance
    const transports: { [sessionId: string]: any } = {};

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      this.log('Incoming HTTP request', {
        method: req.method || 'unknown',
        url: req.url || 'unknown',
        sessionId: (req.headers['mcp-session-id'] as string | undefined) || 'none',
        headers: req.headers,
      });

      // Log response status code for every request
      const originalWriteHead = res.writeHead.bind(res);
      (res as any).writeHead = (statusCode: number, headersOrMsg?: any, headers?: any) => {
        const resHeaders = headers || headersOrMsg;
        this.log('HTTP response', {
          statusCode,
          method: req.method,
          sessionId: (req.headers['mcp-session-id'] as string | undefined) || 'none',
          contentType: resHeaders?.['Content-Type'] || resHeaders?.['content-type'],
          responseSessionId: resHeaders?.['mcp-session-id'],
        });
        return originalWriteHead(statusCode, headersOrMsg, headers);
      };

      Sentry.withScope((scope: any) => {
        scope.setTag('url', req.url || '');
        scope.setTag('method', req.method || '');
      });

      if (!checkAuth(req, res)) return;

      // Store transports by session ID for session management
      // (defined outside createServer so it persists across requests)
      if (req.method === 'POST' && req.url === '/mcp') {
        try {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const requestBody = JSON.parse(body);
              let transport: any;

              this.log('POST request body', {
                jsonrpc: requestBody.jsonrpc,
                method: requestBody.method,
                id: requestBody.id,
                protocolVersion: requestBody.params?.protocolVersion,
                clientInfo: requestBody.params?.clientInfo,
                capabilities: requestBody.params?.capabilities,
              });

              const sessionId = req.headers['mcp-session-id'] as string | undefined;

              if (sessionId && transports[sessionId]) {
                this.log('Reusing existing transport', { sessionId });
                transport = transports[sessionId];
              } else if (!sessionId && isInitializeRequest(requestBody)) {
                this.log('Creating new transport for session initialization');
                const newServer = new Server(
                  { name: 'mcp-server', version: '1.0.0' },
                  { capabilities: { tools: {} } }
                );
                this.setupToolHandlersForServer(newServer, transports);

                transport = new StreamableHTTPServerTransport({
                  sessionIdGenerator: () => require('crypto').randomUUID(),
                  onsessioninitialized: (newSessionId: string) => {
                    this.log('Session initialized', { sessionId: newSessionId });
                    transports[newSessionId] = transport;
                  },
                  enableDnsRebindingProtection: false,
                  enableJsonResponse: true,
                });

                transport.onclose = () => {
                  this.log('Cleaning up transport', { sessionId: transport.sessionId || 'unknown' });
                  if (transport.sessionId) {
                    delete transports[transport.sessionId];
                  }
                };

                transport.onerror = (error: any) => {
                  this.log('Transport error', { sessionId: transport.sessionId, error: error?.message });
                };

                await newServer.connect(transport);
              } else {
                if (!res.headersSent) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                    id: null,
                  }));
                }
                return;
              }

              await transport.handleRequest(req, res, requestBody);
            } catch (error) {
              console.error(`[${serviceName}] Request processing error:`, error);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  error: { code: -32603, message: 'Internal server error' },
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

  private setupToolHandlersForServer(server: any, transports?: { [sessionId: string]: any }) {
    // NOTE: Do NOT override InitializeRequestSchema here.
    // The SDK's Server class registers its own _oninitialize handler in the constructor which:
    //   - sets _clientCapabilities and _clientVersion internal state
    //   - negotiates protocolVersion correctly from SUPPORTED_PROTOCOL_VERSIONS
    // Overriding it breaks SDK internals and causes silent failures.

    server.setNotificationHandler(InitializedNotificationSchema, async (notification: any) => {
      this.log('MCP client initialized successfully', {
        clientInfo: server.getClientVersion?.(),
        clientCapabilities: server.getClientCapabilities?.(),
      });
    });

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.log('Tools list requested', { toolCount: tools.length, tools: tools.map((t: any) => t.name) });
      return {
        tools
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      this.log('Tool call received', { tool: name, args });
      try {
        const result = await handleToolCall(name, args);
        this.log('Tool call completed', { tool: name, isError: (result as any)?.isError });
        return result;
      } catch (error: any) {
        this.log('Tool call failed', { tool: name, error: error?.message });
        throw error;
      }
    });
  }
}
