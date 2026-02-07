import express, { type Express, type Request, type Response } from 'express';
import { McpServer } from './mcp/server.js';

export async function createServer(): Promise<Express> {
  const app = express();

  app.use(express.json());

  const mcpServer = new McpServer();
  await mcpServer.initialize();

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP endpoints
  app.post('/mcp', (req: Request, res: Response): void => {
    try {
      const result = mcpServer.handleRequest(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return app;
}
