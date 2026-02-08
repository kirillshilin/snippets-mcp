import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SnippetService } from '../services/snippet-service.js';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';

export class SnippetsMcpServer {
  public readonly mcpServer: McpServer;
  private snippetService: SnippetService;

  constructor() {
    this.mcpServer = new McpServer(
      {
        name: 'snippets-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.snippetService = new SnippetService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Register list_snippets tool
    this.mcpServer.registerTool(
      'list_snippets',
      {
        description: 'List all available code snippets',
        inputSchema: z.object({}),
      },
      () => {
        const snippets = this.snippetService.listSnippetMetadata();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(snippets, null, 2),
            },
          ],
        };
      },
    );

    // Register get_snippet tool
    this.mcpServer.registerTool(
      'get_snippet',
      {
        description: 'Get a specific code snippet by ID',
        inputSchema: z.object({
          prefix: z.string().describe('The ID of the snippet to retrieve'),
        }),
      },
      async ({ prefix }) => {
        await this.mcpServer.sendLoggingMessage({
          level: 'info',
          data: `Received get_snippet request for prefix: ${prefix}`,
        });
        const snippet = await this.snippetService.getSnippet(prefix);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(snippet, null, 2),
            },
          ],
        };
      },
    );

    // Register search_snippets tool
    this.mcpServer.registerTool(
      'search_snippets',
      {
        description: 'Search for snippets by language or tag',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
          limit: z.number().int().positive().optional().describe('Max results (default 1)'),
        }),
      },
      (args) => {
        const snippets = this.snippetService.searchSnippets(args.query, args.limit);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(snippets, null, 2),
            },
          ],
        };
      },
    );

    // Register snippets list resource
    this.mcpServer.registerResource(
      'All Snippets',
      'snippet://list',
      {
        description: 'List of all available code snippets',
        mimeType: 'application/json',
      },
      () => {
        const snippets = this.snippetService.listSnippetMetadata();
        return {
          contents: [
            {
              uri: 'snippet://list',
              mimeType: 'application/json',
              text: JSON.stringify(snippets, null, 2),
            },
          ],
        };
      },
    );
  }

  public async initialize(): Promise<void> {
    // Initialize snippet service to load all snippets
    await this.snippetService.initialize();

    // Register each snippet as a resource
    this.registerSnippetResources();
  }

  private registerSnippetResources(): void {
    const snippets = this.snippetService.listSnippetMetadata();

    for (const snippet of snippets) {
      const uri = `snippet://${snippet.prefix}`;
      this.mcpServer.registerResource(
        snippet.title,
        uri,
        {
          description: snippet.description,
          mimeType: 'text/plain',
        },
        async () => {
          const fullSnippet = await this.snippetService.getSnippet(snippet.prefix);
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: fullSnippet.content,
              },
            ],
          };
        },
      );
    }
  }

  public listSnippetMetadata(): SnippetMetadata[] {
    return this.snippetService.listSnippetMetadata();
  }

  public searchSnippetMetadata(query: string, limit?: number): SnippetMetadata[] {
    return this.snippetService.searchSnippets(query, limit);
  }

  public async getSnippet(prefix: string): Promise<Snippet> {
    return this.snippetService.getSnippet(prefix);
  }

  public handleRequest(request: unknown): unknown {
    // TODO: Implement HTTP request handling
    // This will need to parse the incoming request and route it appropriately
    return { error: 'Not implemented', request };
  }

  public async close(): Promise<void> {
    await this.mcpServer.close();
  }
}
