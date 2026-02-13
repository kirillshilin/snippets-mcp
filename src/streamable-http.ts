import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SnippetsMcpServer } from './mcp/server.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { config } from './config.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

type LogContext = Record<string, unknown>;

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ' {"context":"unserializable"}';
  }
}

function logInfo(message: string, context?: LogContext): void {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}] INFO ${message}${formatContext(context)}`);
}

function logError(message: string, error?: unknown, context?: LogContext): void {
  const errorPayload =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
  const mergedContext = errorPayload != null ? { ...context, error: errorPayload } : context;

  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}] ERROR ${message}${formatContext(mergedContext)}`);
}

function main(): void {
  logInfo('Starting MCP Streamable HTTP server');

  // Create Express app with MCP defaults (includes localhost protection)
  const app = createMcpExpressApp();

  // Store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Function to create a new MCP server instance for each session
  const createMcpServer = async (): Promise<SnippetsMcpServer> => {
    const mcpServer = new SnippetsMcpServer();
    await mcpServer.initialize();
    return mcpServer;
  };

  // Handle POST requests for MCP messages
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const mcpPostHandler = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (typeof sessionId === 'string' && sessionId in transports) {
        // Reuse existing transport
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        transport = transports[sessionId]!;
      } else if (typeof sessionId === 'undefined' && isInitializeRequest(req.body)) {
        // New initialization request - create a new MCP server instance
        const mcpServer = await createMcpServer();
        logInfo('Created new MCP server instance for new session');

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: (): string => randomUUID(),
          onsessioninitialized: (newSessionId: string): void => {
            // Store the transport by session ID when session is initialized
            logInfo('Session initialized', { sessionId: newSessionId });
            transports[newSessionId] = transport;
          },
        });

        // Set up onclose handler to clean up transport when closed
        const oncloseHandler = (): void => {
          const sid = transport.sessionId;
          if (typeof sid === 'string' && sid in transports) {
            logInfo('Transport closed', { sessionId: sid });
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete transports[sid];
            void mcpServer.close();
          }
        };
        transport.onclose = oncloseHandler;

        const onerrorHandler = (error: Error): void => {
          const sid = transport.sessionId;
          if (typeof sid === 'string' && sid in transports) {
            logError('Transport error', error, { sessionId: sid });
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete transports[sid];
            void mcpServer.close();
          }
        };
        transport.onerror = onerrorHandler;

        // Connect the transport to the MCP server
        // TypeScript workaround: StreamableHTTPServerTransport's onclose type differs slightly from Transport
        await mcpServer.mcpServer.connect(
          transport as unknown as import('@modelcontextprotocol/sdk/shared/transport.js').Transport,
        );
        logInfo('MCP server connected to transport');
      } else if (typeof sessionId === 'string' && !(sessionId in transports)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      } else {
        res
          .status(400)
          .json({ error: 'Invalid request: missing session ID or not an initialization request' });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logError('Error handling POST request', error, { sessionId });
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/mcp', mcpPostHandler);

  // Handle GET requests for SSE streams
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const mcpGetHandler = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (typeof sessionId !== 'string' || !(sessionId in transports)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (typeof lastEventId === 'string') {
      logInfo('Client reconnecting', { sessionId, lastEventId });
    } else {
      logInfo('Establishing new SSE stream', { sessionId });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const transport = transports[sessionId]!;
    await transport.handleRequest(req, res);
  };

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/mcp', mcpGetHandler);

  // Handle DELETE requests for session termination
  app.delete('/mcp', (req, res): void => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (typeof sessionId !== 'string') {
      res.status(400).json({ error: 'Missing session ID' });
      return;
    }

    const transport = transports[sessionId];
    if (typeof transport !== 'undefined') {
      logInfo('Deleting session', { sessionId });
      void transport.close();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete transports[sessionId];
      res.status(200).json({ message: 'Session terminated' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // Health check endpoint
  app.get('/health', (_req, res): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start the server
  app.listen(config.port, config.host, () => {
    logInfo(`MCP Streamable HTTP Server running on http://${config.host}:${config.port}`);
    logInfo(`MCP endpoint: http://${config.host}:${config.port}/mcp`);
  });
}

main();
