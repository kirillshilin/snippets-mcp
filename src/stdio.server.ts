#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SnippetsMcpServer } from './snippets.mcp-server.js';
import { resolveSnippetsDirFromArgv } from './utils/argv.js';
import { logInfo, logWarn, logError } from './utils/logger.js';

async function main(): Promise<void> {
  logInfo('Starting MCP stdio server');
  const snippetsDir = resolveSnippetsDirFromArgv(process.argv);
  const server = new SnippetsMcpServer(snippetsDir ? { snippetsDir } : undefined);
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
