import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import MiniSearch from 'minisearch';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';
import { config } from '../config.js';

interface SnippetFile {
  metadata: SnippetMetadata;
  filePath: string;
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
        // Skip non-JSON files
        if (extname(file) !== '.json') {
          // eslint-disable-next-line no-console
          continue;
        }

        const filePath = join(this.snippetsDir, file);
        try {
          // eslint-disable-next-line no-console
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content) as Record<string, unknown>;

          // Validate and extract metadata
          const metadata = this.parseSnippetMetadata(data);
          const prefix = metadata.prefix;

          // Store metadata with file path
          this.snippets.set(prefix, {
            metadata,
            filePath,
          });
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

    try {
      // Read the full file to get content
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
