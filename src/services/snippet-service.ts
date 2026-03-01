import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import MiniSearch from 'minisearch';
import type { Snippet, SnippetMetadata } from '../types/snippet.js';
import { config } from '../config.js';
import type { SnippetLoader } from './loaders/index.js';
import { StandardJsonLoader, VSCodeSnippetLoader, MarkdownLoader } from './loaders/index.js';

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
      new MarkdownLoader(), // Markdown files with YAML front matter
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
      await this.assertSnippetsDir();
      await this.loadSnippetsFromDir(this.snippetsDir);
      this.finalizeIndex();
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

  private async assertSnippetsDir(): Promise<void> {
    const dirStats = await stat(this.snippetsDir);
    if (!dirStats.isDirectory()) {
      throw new Error(`Snippets path is not a directory: ${this.snippetsDir}`);
    }
  }

  private async loadSnippetsFromDir(dirPath: string): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.loadSnippetsFromDir(entryPath);
        continue;
      }
      if (entry.isFile()) {
        await this.loadSnippetsFromFile(entryPath, entry.name);
      }
    }
  }

  private async loadSnippetsFromFile(filePath: string, fileName: string): Promise<void> {
    const ext = extname(fileName);
    try {
      const content = await readFile(filePath, 'utf-8');
      await this.tryLoadWithLoaders(filePath, fileName, ext, content);
    } catch (error) {
      console.error(`Failed to load snippet from ${fileName}:`, error);
    }
  }

  private async tryLoadWithLoaders(
    filePath: string,
    fileName: string,
    ext: string,
    content: string,
  ): Promise<void> {
    for (const loader of this.loaders) {
      if (!loader.canHandle(filePath, ext)) {
        continue;
      }

      try {
        const snippets = loader.loadSnippets(filePath, content);
        if (snippets.length > 0) {
          for (const snippet of snippets) {
            this.snippets.set(snippet.metadata.prefix, {
              metadata: snippet.metadata,
              content: snippet.content,
              filePath: snippet.filePath,
              loader,
            });
          }
          return;
        }
      } catch (error) {
        const loaderName = loader.constructor.name;
        console.error(
          `Loader ${loaderName} failed to process ${fileName}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  private finalizeIndex(): void {
    this.initialized = true;

    if (this.snippets.size > 0) {
      const allMetadata = Array.from(this.snippets.values(), (s) => s.metadata);
      this.searchIndex.addAll(allMetadata);
    }
  }

  /**
   * Get list of all snippet metadata (without content), optionally filtered by scope
   */
  public listSnippetMetadata(scope?: string): SnippetMetadata[] {
    const allSnippets = Array.from(this.snippets.values()).map((snippet) => snippet.metadata);
    if (!scope) {
      return allSnippets;
    }
    const normalizedScope = scope.trim().toLowerCase();
    const normalizedScopeToken = normalizedScope.startsWith('.')
      ? normalizedScope.slice(1)
      : normalizedScope;
    return allSnippets.filter((metadata) =>
      this.matchesScope(metadata.scope, normalizedScopeToken),
    );
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
  public searchSnippets(query: string, limit: number = 5, scope?: string): SnippetMetadata[] {
    // eslint-disable-next-line no-console
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results = this.searchIndex.search(query, {});
    const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 5;
    if (normalizedLimit <= 0) {
      return [];
    }
    const normalizedScope = scope?.trim().toLowerCase();
    const normalizedScopeToken = normalizedScope?.startsWith('.')
      ? normalizedScope.slice(1)
      : normalizedScope;

    const matches: SnippetMetadata[] = [];
    for (const result of results) {
      if (matches.length >= normalizedLimit) {
        break;
      }

      // MiniSearch returns stored fields as index signatures, requiring bracket notation
      const prefix = String(result['prefix']);
      const snippet = this.snippets.get(prefix);
      if (snippet === undefined) {
        throw new Error(`Search index out of sync: snippet ${prefix} not found`);
      }

      if (
        normalizedScopeToken &&
        !this.matchesScope(snippet.metadata.scope, normalizedScopeToken)
      ) {
        continue;
      }

      matches.push(snippet.metadata);
    }

    // eslint-disable-next-line no-console
    return matches;
  }

  private matchesScope(scopes: string[], target: string): boolean {
    const normalizedTarget = target.toLowerCase();
    return scopes
      .map((scope) => scope.trim().toLowerCase())
      .filter((scope) => scope.length > 0)
      .map((scope) => (scope.startsWith('.') ? scope.slice(1) : scope))
      .includes(normalizedTarget);
  }
}
