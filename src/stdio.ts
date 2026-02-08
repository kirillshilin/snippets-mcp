import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SnippetsMcpServer } from './mcp/server.js';

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

function logWarn(message: string, context?: LogContext): void {
  // eslint-disable-next-line no-console
  console.warn(`[${new Date().toISOString()}] WARN ${message}${formatContext(context)}`);
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
  logInfo('Starting MCP stdio server');
  const server = new SnippetsMcpServer();
  logInfo('Initializing MCP server');
  await server.initialize();
  logInfo('MCP server initialized');

  const transport = new StdioServerTransport();
  logInfo('Connecting MCP server to stdio transport');
  await server.mcpServer.connect(transport);
  logInfo('MCP server connected to stdio transport');

  // Handle process signals
  process.on('SIGINT', () => {
    logWarn('Received SIGINT, shutting down');
    server
      .close()
      .then(() => {
        logInfo('MCP server closed after SIGINT');
        process.exit(0);
      })
      .catch((error) => {
        logError('Error closing server', error);
        process.exit(1);
      });
  });

  process.on('SIGTERM', () => {
    logWarn('Received SIGTERM, shutting down');
    server
      .close()
      .then(() => {
        logInfo('MCP server closed after SIGTERM');
        process.exit(0);
      })
      .catch((error) => {
        logError('Error closing server', error);
        process.exit(1);
      });
  });
}

main().catch((error) => {
  logError('Fatal error in MCP server', error);
  process.exit(1);
});
