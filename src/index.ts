import { createServer } from './server.js';
import { config } from './config.js';

async function main(): Promise<void> {
  try {
    const server = await createServer();

    server.listen(config.port, config.host, () => {
      // eslint-disable-next-line no-console
      console.log(`MCP Snippets Server running on http://${config.host}:${config.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void main();
