import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { SnippetsMcpServer } from './mcp/server.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { config } from './config.js';

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

async function main(): Promise<void> {
  logInfo('Starting MCP HTTP/SSE server');

  const mcpServer = new SnippetsMcpServer();
  logInfo('Initializing MCP server');
  await mcpServer.initialize();
  logInfo('MCP server initialized');

  // Create Express app with MCP defaults (includes localhost protection)
  const app = createMcpExpressApp();

  // Store transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  // SSE endpoint - clients connect here to receive server-sent events
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/sse', async (_req, res) => {
    logInfo('SSE connection request received');

    const transport = new SSEServerTransport('/messages', res);
    await transport.start();

    transports.set(transport.sessionId, transport);
    logInfo('SSE transport started', { sessionId: transport.sessionId });

    // Connect the transport to the MCP server
    await mcpServer.mcpServer.connect(transport);
    logInfo('MCP server connected to SSE transport', { sessionId: transport.sessionId });

    // Clean up when transport closes
    transport.onclose = (): void => {
      logInfo('SSE transport closed', { sessionId: transport.sessionId });
      transports.delete(transport.sessionId);
    };

    transport.onerror = (error: Error): void => {
      logError('SSE transport error', error, { sessionId: transport.sessionId });
      transports.delete(transport.sessionId);
    };
  });

  // Message endpoint - clients POST messages here
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/messages', async (req, res) => {
    const sessionId = req.query['sessionId'] as string;

    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      res.status(400).json({ error: 'Missing or invalid sessionId query parameter' });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (error) {
      logError('Error handling POST message', error, { sessionId });
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start the server
  app.listen(config.port, config.host, () => {
    logInfo(`MCP HTTP/SSE Server running on http://${config.host}:${config.port}`);
    logInfo(`SSE endpoint: http://${config.host}:${config.port}/sse`);
    logInfo(`Messages endpoint: http://${config.host}:${config.port}/messages`);
  });
}

main().catch((error) => {
  logError('Fatal error in MCP HTTP/SSE server', error);
  process.exit(1);
});
