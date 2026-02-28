import { createServer } from './api.js';
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

  const app = await createServer();

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
