import { createServer } from './api.js';
import { config } from './config.js';
import { logInfo, logError } from './utils/logger.js';

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
