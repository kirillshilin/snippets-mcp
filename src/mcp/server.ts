import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SnippetService } from '../services/snippet-service.js';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';
import {
  listSnippetsInputSchema,
  getSnippetInputSchema,
  searchSnippetsInputSchema,
} from '../schemas/input-schemas.js';
import {
  listSnippetsOutputSchema,
  getSnippetOutputSchema,
  searchSnippetsOutputSchema,
} from '../schemas/output-schemas.js';

const DEFAULT_TOOL_DESCRIPTIONS = {
  list_snippets:
    'List available code snippets as an overview (prefix, title, description). Optionally filter by scope (language or file type). Infer scope from the open file, the project type, or the majority of files in the project. Use this to review which snippets are available.',
  get_snippet:
    'Get the full content of a specific code snippet by its prefix (unique ID). Use after identifying the right snippet via list_snippets or search_snippets.',
  search_snippets:
    'Full-text search across snippet titles, descriptions, keywords, and scope to find matching candidates for a given request. Infer scope from the open file, the project type, or the majority of files in the project.',
};

export class SnippetsMcpServer {
  public readonly mcpServer: McpServer;
  private snippetService: SnippetService;
  private toolDescriptions = { ...DEFAULT_TOOL_DESCRIPTIONS };

  constructor(options?: { snippetsDir?: string }) {
    this.mcpServer = new McpServer(
      {
        name: 'snippets-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    this.snippetService = new SnippetService(options?.snippetsDir);
  }

  private setupHandlers(): void {
    // Register list_snippets tool
    this.mcpServer.registerTool(
      'list_snippets',
      {
        description: this.toolDescriptions.list_snippets,
        inputSchema: listSnippetsInputSchema,
        outputSchema: listSnippetsOutputSchema,
      },
      ({ scope }) => {
        const snippets = this.snippetService.listSnippetMetadata(scope);
        const overview = snippets.map(({ prefix, title, description }) => ({
          prefix,
          title,
          description,
        }));
        return {
          content: [
            {
              type: 'text' as const,
              text: this.toMarkdownTable(snippets),
            },
          ],
          structuredContent: { snippets: overview },
        };
      },
    );

    // Register get_snippet tool
    this.mcpServer.registerTool(
      'get_snippet',
      {
        description: this.toolDescriptions.get_snippet,
        inputSchema: getSnippetInputSchema,
        outputSchema: getSnippetOutputSchema,
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
          structuredContent: { snippet },
        };
      },
    );

    // Register search_snippets tool
    this.mcpServer.registerTool(
      'search_snippets',
      {
        description: this.toolDescriptions.search_snippets,
        inputSchema: searchSnippetsInputSchema,
        outputSchema: searchSnippetsOutputSchema,
      },
      (args) => {
        const snippets = this.snippetService.searchSnippets(args.query, args.limit, args.scope);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(snippets, null, 2),
            },
          ],
          structuredContent: { snippets },
        };
      },
    );

    // Register use_snippet prompt
    this.mcpServer.registerPrompt(
      'use_snippet',
      {
        title: 'Use a snippet for a task',
        description:
          'Suggests searching for an appropriate snippet and adapting it to the current project',
        argsSchema: {
          task: z.string().describe('The task or feature you want to implement'),
        },
      },
      ({ task }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to implement the following: ${task}

Please use the search_snippets tool to find an appropriate snippet for this task.
Once you find a relevant snippet, adapt it to fit the current project:
- Replace any placeholder values with project-specific values
- If the snippet contains colors or styling, adapt them to match the project's color schema and design system
- Adjust any naming conventions to match the project's coding style
- Make sure the snippet integrates properly with the existing codebase`,
            },
          },
        ],
      }),
    );

    // Register list_snippets_for_language prompt
    this.mcpServer.registerPrompt(
      'list_snippets_for_language',
      {
        title: 'List snippets for a language',
        description:
          'Lists all available snippets for a specific programming language so you can review what is available and retrieve the actual code',
        argsSchema: {
          language: z.string().describe('The programming language to list snippets for'),
        },
      },
      ({ language }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please use the list_snippets tool to retrieve all available snippets, then show me only the snippets for the "${language}" language (match against the scope or keywords fields).

For each matching snippet, display:
- prefix (ID used to retrieve the full snippet)
- title
- description

After listing them, let me know I can ask you to retrieve the full code for any snippet using its prefix.`,
            },
          },
        ],
      }),
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
    // Load tool descriptions from assets markdown files
    await this.loadToolDescriptions();

    // Register tools and handlers with the loaded descriptions
    this.setupHandlers();

    // Initialize snippet service to load all snippets
    await this.snippetService.initialize();

    // Register each snippet as a resource
    this.registerSnippetResources();
  }

  private async loadToolDescriptions(): Promise<void> {
    const descriptionsDir = join(
      fileURLToPath(new URL('../../assets/descriptions', import.meta.url)),
    );
    const tools = ['list_snippets', 'get_snippet', 'search_snippets'] as const;
    for (const tool of tools) {
      try {
        const content = await readFile(join(descriptionsDir, `${tool}.md`), 'utf-8');
        this.toolDescriptions[tool] = content;
      } catch {
        // Keep the default description if the file cannot be read
      }
    }
  }

  private toMarkdownTable(snippets: SnippetMetadata[]): string {
    if (snippets.length === 0) {
      return 'No snippets found.';
    }
    const escape = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
    const header = '| Prefix | Title | Description |\n|--------|-------|-------------|';
    const rows = snippets.map(
      (s) => `| ${escape(s.prefix)} | ${escape(s.title)} | ${escape(s.description)} |`,
    );
    return [header, ...rows].join('\n');
  }

  private getResourcePath(snippet: SnippetMetadata): string {
    // Use keyword0/keyword1/prefix format - prefix is always included as it's unique
    const keyword0 = snippet.keywords[0] ?? '';
    const keyword1 = snippet.keywords[1] ?? '';
    const pathSegments = [keyword0, keyword1, snippet.prefix].map(encodeURIComponent);
    return pathSegments.join('/');
  }

  private registerSnippetResources(): void {
    const snippets = this.snippetService.listSnippetMetadata();

    for (const snippet of snippets) {
      const keywordPath = this.getResourcePath(snippet);
      const uri = `snippet://${keywordPath}`;
      this.mcpServer.registerResource(
        snippet.title,
        uri,
        {
          description: snippet.description,
          mimeType: 'text/plain',
        },
        async () => {
          try {
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
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/plain',
                  text: `Error loading snippet: ${errorMessage}`,
                },
              ],
            };
          }
        },
      );
    }
  }

  public listSnippetMetadata(scope?: string): SnippetMetadata[] {
    return this.snippetService.listSnippetMetadata(scope);
  }

  public searchSnippetMetadata(query: string, limit?: number, scope?: string): SnippetMetadata[] {
    return this.snippetService.searchSnippets(query, limit, scope);
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
