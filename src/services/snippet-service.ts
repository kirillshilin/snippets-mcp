import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import MiniSearch from 'minisearch';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';
import { config } from '../config.js';

interface SnippetFile {
  metadata: SnippetMetadata;
  filePath: string;
  content?: string; // For VS Code snippets, content is stored in memory
  snippetKey?: string; // For VS Code snippets, the key in the file
}

export class SnippetService {
  private readonly snippets: Map<string, SnippetFile>;
  private readonly snippetsDir: string;
  private initialized: boolean = false;
  private searchIndex: MiniSearch<SnippetMetadata>;

  constructor(snippetsDir?: string) {
    this.snippets = new Map();
    this.snippetsDir = snippetsDir ?? config.snippetsDir;

    // eslint-disable-next-line no-console

    // Initialize MiniSearch with fields to index
    this.searchIndex = new MiniSearch({
      fields: ['title', 'description', 'keywords', 'scope', 'prefix'],
      storeFields: ['prefix', 'title', 'description', 'scope', 'keywords'],
      idField: 'prefix', // Use prefix as the unique identifier
      searchOptions: {
        boost: { title: 2, keywords: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /**
   * Initialize the service by loading all snippet metadata from files
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      // eslint-disable-next-line no-console
      return;
    }

    try {
      // eslint-disable-next-line no-console
      // Check if snippets directory exists
      const dirStats = await stat(this.snippetsDir);
      if (!dirStats.isDirectory()) {
        throw new Error(`Snippets path is not a directory: ${this.snippetsDir}`);
      }

      // Read all files in the snippets directory
      const files = await readdir(this.snippetsDir);
      // eslint-disable-next-line no-console

      // Load metadata from each snippet file
      for (const file of files) {
        const ext = extname(file);
        // Support both .json and .code-snippet files
        if (ext !== '.json' && ext !== '.code-snippet') {
          // eslint-disable-next-line no-console
          continue;
        }

        const filePath = join(this.snippetsDir, file);
        try {
          // eslint-disable-next-line no-console
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content) as Record<string, unknown>;

          // Check if this is a VS Code snippet file (multiple snippets)
          if (this.isVSCodeSnippetFile(data)) {
            // Parse VS Code snippet format
            this.loadVSCodeSnippets(data, filePath);
          } else {
            // Parse standard format (single snippet per file)
            const metadata = this.parseSnippetMetadata(data);
            const prefix = metadata.prefix;

            // Store metadata with file path
            this.snippets.set(prefix, {
              metadata,
              filePath,
            });
          }
          // eslint-disable-next-line no-console
        } catch (error) {
          console.error(`Failed to load snippet from ${file}:`, error);
          // Continue loading other snippets
        }
      }

      this.initialized = true;

      // Index all snippets for search after loading
      if (this.snippets.size > 0) {
        const allMetadata = Array.from(this.snippets.values(), (s) => s.metadata);
        this.searchIndex.addAll(allMetadata);
        // eslint-disable-next-line no-console
      } else {
        // eslint-disable-next-line no-console
      }
    } catch (error) {
      // If directory doesn't exist, just initialize with empty snippets
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Snippets directory not found: ${this.snippetsDir}`);
        this.initialized = true;
        return;
      }
      throw error;
    }
  }

  /**
   * Parse and validate snippet metadata from raw data
   */
  private parseSnippetMetadata(data: Record<string, unknown>): SnippetMetadata {
    // eslint-disable-next-line no-console
    if (typeof data['prefix'] !== 'string' || data['prefix'].length === 0) {
      throw new Error('Invalid or missing prefix field');
    }
    if (typeof data['title'] !== 'string' || data['title'].length === 0) {
      throw new Error('Invalid or missing title field');
    }
    if (typeof data['description'] !== 'string') {
      throw new Error('Invalid or missing description field');
    }
    if (typeof data['scope'] !== 'string') {
      throw new Error('Invalid or missing scope field');
    }

    // Keywords can be array or undefined
    let keywords: string[] = [];
    if (data['keywords'] !== undefined) {
      if (Array.isArray(data['keywords'])) {
        keywords = data['keywords'].filter((k): k is string => typeof k === 'string');
      } else {
        throw new Error('Invalid keywords field - must be an array');
      }
    }

    return {
      prefix: data['prefix'],
      title: data['title'],
      description: data['description'],
      scope: data['scope'],
      keywords,
    };
  }

  /**
   * Check if data represents a VS Code snippet file format
   * VS Code snippets don't have 'prefix' and 'title' at top level
   */
  private isVSCodeSnippetFile(data: Record<string, unknown>): boolean {
    // If it has prefix and title at top level, it's standard format
    if ('prefix' in data && 'title' in data) {
      return false;
    }

    // Check if it looks like VS Code format (snippets as nested objects)
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const snippet = value as Record<string, unknown>;
        // VS Code snippets have 'body' field
        if ('body' in snippet) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Load VS Code format snippets from a file
   */
  private loadVSCodeSnippets(data: Record<string, unknown>, filePath: string): void {
    for (const [snippetName, snippetData] of Object.entries(data)) {
      // Skip if not an object
      if (typeof snippetData !== 'object' || snippetData === null || Array.isArray(snippetData)) {
        continue;
      }

      try {
        const snippet = snippetData as Record<string, unknown>;

        // Parse prefix - can be string or array
        let prefix: string;
        if (typeof snippet['prefix'] === 'string') {
          prefix = snippet['prefix'];
        } else if (Array.isArray(snippet['prefix']) && snippet['prefix'].length > 0) {
          // Use first prefix if array
          prefix = String(snippet['prefix'][0]);
        } else {
          // eslint-disable-next-line no-console
          continue;
        }

        // Parse scope - default to empty string if not present
        const scope = typeof snippet['scope'] === 'string' ? snippet['scope'] : '';

        // Parse description - default to empty string if not present
        const description =
          typeof snippet['description'] === 'string' ? snippet['description'] : '';

        // Parse body - must be string array
        let content: string;
        if (Array.isArray(snippet['body'])) {
          content = snippet['body']
            .filter((line): line is string => typeof line === 'string')
            .join('\n');
        } else if (typeof snippet['body'] === 'string') {
          content = snippet['body'];
        } else {
          // eslint-disable-next-line no-console
          continue;
        }

        // Create metadata
        const metadata: SnippetMetadata = {
          prefix,
          title: snippetName, // Use snippet name as title
          description,
          scope,
          keywords: [], // VS Code format doesn't have keywords
        };

        // Store with content in memory
        this.snippets.set(prefix, {
          metadata,
          filePath,
          content, // Store content directly for VS Code snippets
          snippetKey: snippetName,
        });
      } catch (error) {
        console.error(`Failed to parse snippet ${snippetName} from ${filePath}:`, error);
        // Continue with other snippets
      }
    }
  }

  /**
   * Get list of all snippet metadata (without content)
   */
  public listSnippetMetadata(): SnippetMetadata[] {
    // eslint-disable-next-line no-console
    return Array.from(this.snippets.values()).map((snippet) => snippet.metadata);
  }

  /**
   * Get the content of a specific snippet by its prefix
   */
  public async getSnippetContent(prefix: string): Promise<string> {
    // eslint-disable-next-line no-console
    const snippet = this.snippets.get(prefix);
    if (snippet === undefined) {
      throw new Error(`Snippet not found: ${prefix}`);
    }

    // If content is already stored (VS Code snippet), return it
    if (snippet.content !== undefined) {
      return snippet.content;
    }

    try {
      // Read the full file to get content (standard format)
      // eslint-disable-next-line no-console
      const content = await readFile(snippet.filePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, unknown>;

      if (typeof data['content'] !== 'string') {
        throw new Error('Invalid or missing content field');
      }

      return data['content'];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read snippet content for ${prefix}: ${errorMessage}`);
    }
  }

  /**
   * Get a complete snippet including both metadata and content
   */
  public async getSnippet(prefix: string): Promise<Snippet> {
    // eslint-disable-next-line no-console
    const snippet = this.snippets.get(prefix);
    if (snippet === undefined) {
      throw new Error(`Snippet not found: ${prefix}`);
    }

    const content = await this.getSnippetContent(prefix);
    return {
      ...snippet.metadata,
      content,
    };
  }

  /**
   * Search snippets by query string using full text search
   * Searches across title, description, keywords, scope, and prefix
   */
  public searchSnippets(query: string, limit: number = 1): SnippetMetadata[] {
    // eslint-disable-next-line no-console
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results = this.searchIndex.search(query, {});
    const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 1;
    if (normalizedLimit <= 0) {
      return [];
    }
    // eslint-disable-next-line no-console
    return results.slice(0, normalizedLimit).map((result) => {
      // MiniSearch returns stored fields as index signatures, requiring bracket notation
      const prefix = String(result['prefix']);
      const snippet = this.snippets.get(prefix);
      if (snippet === undefined) {
        throw new Error(`Search index out of sync: snippet ${prefix} not found`);
      }
      return snippet.metadata;
    });
  }
}
