import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SnippetService } from '../services/snippet-service.js';

export class McpServer {
  private server: Server;
  private snippetService: SnippetService;

  constructor() {
    this.server = new Server(
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
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: 'list_snippets',
            description: 'List all available code snippets',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_snippet',
            description: 'Get a specific code snippet by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The ID of the snippet to retrieve',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'search_snippets',
            description: 'Search for snippets by language or tag',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_snippets':
          return this.handleListSnippets();
        case 'get_snippet':
          return this.handleGetSnippet(args);
        case 'search_snippets':
          return this.handleSearchSnippets(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, () => {
      return {
        resources: [
          {
            uri: 'snippet://list',
            name: 'All Snippets',
            description: 'List of all available code snippets',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, (request) => {
      const { uri } = request.params;

      if (uri === 'snippet://list') {
        const snippets = this.snippetService.listSnippets();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(snippets, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private handleListSnippets(): { content: Array<{ type: string; text: string }> } {
    const snippets = this.snippetService.listSnippets();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(snippets, null, 2),
        },
      ],
    };
  }

  private handleGetSnippet(args: unknown): { content: Array<{ type: string; text: string }> } {
    // TODO: Implement proper validation with Zod
    const id = (args as { id?: string })['id'];
    if (typeof id !== 'string') {
      throw new Error('Invalid snippet ID');
    }

    const snippet = this.snippetService.getSnippet(id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(snippet, null, 2),
        },
      ],
    };
  }

  private handleSearchSnippets(args: unknown): { content: Array<{ type: string; text: string }> } {
    // TODO: Implement proper validation with Zod
    const query = (args as { query?: string })['query'];
    if (typeof query !== 'string') {
      throw new Error('Invalid search query');
    }

    const snippets = this.snippetService.searchSnippets(query);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(snippets, null, 2),
        },
      ],
    };
  }

  public async initialize(): Promise<void> {
    // Initialize the MCP server
    // In HTTP mode, we don't need to connect to transport
  }

  public handleRequest(request: unknown): unknown {
    // TODO: Implement HTTP request handling
    // This will need to parse the incoming request and route it appropriately
    return { error: 'Not implemented', request };
  }

  public async close(): Promise<void> {
    await this.server.close();
  }
}
