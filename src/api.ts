import express, { type Express, type Request, type Response } from 'express';
import { SnippetsMcpServer } from './mcp/server.js';

export async function createServer(): Promise<Express> {
  const app = express();

  app.use(express.json());

  const mcpServer = new SnippetsMcpServer();
  await mcpServer.initialize();

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Snippets API endpoints
  app.get('/api/snippets', (_req: Request, res: Response): void => {
    const snippets = mcpServer.listSnippetMetadata();
    res.json({ snippets });
  });

  app.get('/api/snippets/search', (req: Request, res: Response): void => {
    const query = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    if (query.length === 0) {
      res.status(400).json({ error: 'Missing query parameter "q"' });
      return;
    }

    const limitRaw = req.query['limit'];
    const limit =
      typeof limitRaw === 'string' && limitRaw.trim().length > 0
        ? Number.parseInt(limitRaw, 10)
        : 1;
    if (!Number.isFinite(limit)) {
      res.status(400).json({ error: 'Invalid query parameter "limit"' });
      return;
    }

    const results = mcpServer.searchSnippetMetadata(query, limit);
    res.json({ query, results, limit });
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/api/snippets/:prefix', async (req: Request, res: Response): Promise<void> => {
    try {
      const snippet = await mcpServer.getSnippet(req.params['prefix'] ?? '');
      res.json(snippet);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Snippet not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: 'Internal server error', message });
    }
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
