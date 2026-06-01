import express, { type Express, type Request, type Response } from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { SnippetsMcpServer } from './snippets.mcp-server.js';
import { bearerAuthMiddleware } from './auth.middleware.js';
import { logInfo, logError } from './utils/logger.js';

// Rate limiter for public (unauthenticated) routes
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

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
  scope: z.string().optional(),
});

const SnippetPrefixSchema = z.object({
  prefix: z.string().min(1, 'Snippet prefix is required'),
});

export async function createServer(): Promise<Express> {
  const app = express();

  app.use(express.json());

  // Serve the web UI from the public directory (rate-limited)
  const publicDir = join(fileURLToPath(new URL('../public', import.meta.url)));
  app.use(publicLimiter, express.static(publicDir));

  const mcpServer = new SnippetsMcpServer();
  await mcpServer.initialize();

  // Store SSE transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  // Health check endpoint
  app.get('/health', publicLimiter, (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Snippets API endpoints
  app.use('/api', bearerAuthMiddleware);
  app.get('/api/snippets', (_req: Request, res: Response): void => {
    const snippets = mcpServer.listSnippetMetadata();
    res.json({ snippets });
  });

  app.get('/api/snippets/search', (req: Request, res: Response): void => {
    try {
      const { q: query, limit, scope } = SearchQuerySchema.parse(req.query);
      const results = mcpServer.searchSnippetMetadata(query, limit, scope);
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

  // SSE endpoint - clients connect here to receive server-sent events
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/sse', bearerAuthMiddleware, async (_req, res) => {
    logInfo('SSE connection request received');

    const transport = new SSEServerTransport('/messages', res);
    await transport.start();

    transports.set(transport.sessionId, transport);
    logInfo('SSE transport started', { sessionId: transport.sessionId });

    await mcpServer.mcpServer.connect(transport);
    logInfo('MCP server connected to SSE transport', { sessionId: transport.sessionId });

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
  app.post('/messages', bearerAuthMiddleware, async (req, res) => {
    const sessionId = req.query['sessionId'] as string;

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

  // SPA fallback — serve index.html for any unmatched GET request
  app.get('*', publicLimiter, (_req: Request, res: Response): void => {
    res.sendFile(join(publicDir, 'index.html'));
  });

  return app;
}
