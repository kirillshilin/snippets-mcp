import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';
import { SnippetsMcpServer } from './mcp/server.js';

// Zod schemas for request validation
const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Query parameter "q" is required and cannot be empty'),
  limit: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => Number.isFinite(val) && val > 0, {
      message: 'Query parameter "limit" must be a valid positive number',
    }),
});

const SnippetPrefixSchema = z.object({
  prefix: z.string().min(1, 'Snippet prefix is required'),
});

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
    try {
      const { q: query, limit } = SearchQuerySchema.parse(req.query);
      const results = mcpServer.searchSnippetMetadata(query, limit);
      res.json({ query, results, limit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors.map((e) => e.message),
        });
        return;
      }
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/api/snippets/:prefix', async (req: Request, res: Response): Promise<void> => {
    try {
      const { prefix } = SnippetPrefixSchema.parse(req.params);
      const snippet = await mcpServer.getSnippet(prefix);
      res.json(snippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors.map((e) => e.message),
        });
        return;
      }
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
