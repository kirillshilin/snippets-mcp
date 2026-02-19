import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import MiniSearch from 'minisearch';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';
import { config } from '../config.js';
import type { SnippetLoader } from './loaders/index.js';
import { StandardJsonLoader, VSCodeSnippetLoader } from './loaders/index.js';

interface SnippetFile {
  metadata: SnippetMetadata;
  content: string | undefined; // For snippets with content in memory
  filePath: string | undefined; // For on-demand loading
  loader: SnippetLoader | undefined; // Loader that handles this snippet
}

export class SnippetService {
  private readonly snippets: Map<string, SnippetFile>;
  private readonly snippetsDir: string;
  private initialized: boolean = false;
  private searchIndex: MiniSearch<SnippetMetadata>;
  private readonly loaders: SnippetLoader[];

  constructor(snippetsDir?: string, loaders?: SnippetLoader[]) {
    this.snippets = new Map();
    this.snippetsDir = snippetsDir ?? config.snippetsDir;

    // Initialize loaders - use provided loaders or default set
    this.loaders = loaders ?? [
      new VSCodeSnippetLoader(), // Try VS Code format first (works for both .json and .code-snippet)
      new StandardJsonLoader(), // Then try standard format
    ];

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
        const filePath = join(this.snippetsDir, file);

        try {
          // eslint-disable-next-line no-console
          const content = await readFile(filePath, 'utf-8');

          // Try each loader until one succeeds
          let loaded = false;
          for (const loader of this.loaders) {
            if (!loader.canHandle(filePath, ext)) {
              continue;
            }

            try {
              const snippets = loader.loadSnippets(filePath, content);
              if (snippets.length > 0) {
                // Store all snippets from this loader
                for (const snippet of snippets) {
                  this.snippets.set(snippet.metadata.prefix, {
                    metadata: snippet.metadata,
                    content: snippet.content, // May be undefined for on-demand loading
                    filePath: snippet.filePath, // For on-demand loading
                    loader, // Store the loader for on-demand content retrieval
                  });
                }
                loaded = true;
                break; // Stop trying other loaders
              }
            } catch (error) {
              // Continue to next loader if this one fails
              continue;
            }
          }

          if (!loaded) {
            // eslint-disable-next-line no-console
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

    // If content is already in memory, return it
    if (snippet.content !== undefined) {
      return snippet.content;
    }

    // Otherwise, load on-demand using the loader
    if (snippet.loader?.getContent && snippet.filePath) {
      const content = await snippet.loader.getContent(snippet.filePath, prefix);
      if (content !== undefined) {
        return content;
      }
    }

    throw new Error(`Unable to load content for snippet: ${prefix}`);
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
