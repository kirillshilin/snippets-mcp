import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { Snippet, SnippetMetadata } from '../types/snippet.types.js';
import { config } from '../app.config.js';
import type { SnippetLoader } from './loaders/index.js';
import { StandardJsonLoader, VSCodeSnippetLoader, MarkdownLoader } from './loaders/index.js';
import type { ISearchIndex } from '../utils/search-index.js';
import { MiniSearchAdapter } from '../utils/minisearch.adapter.js';
import { matchesScope, normalizeScope } from '../utils/scope.utils.js';

interface SnippetFile {
  metadata: SnippetMetadata;
  content: string | undefined;
  filePath: string | undefined;
  loader: SnippetLoader | undefined;
}

export class SnippetService {
  private readonly snippets: Map<string, SnippetFile>;
  private readonly snippetsDir: string;
  private initialized: boolean = false;
  private searchIndex: ISearchIndex<SnippetMetadata>;
  private readonly loaders: SnippetLoader[];

  constructor(snippetsDir?: string, loaders?: SnippetLoader[], searchIndex?: ISearchIndex<SnippetMetadata>) {
    this.snippets = new Map();
    this.snippetsDir = snippetsDir ?? config.snippetsDir;

    this.loaders = loaders ?? [
      new VSCodeSnippetLoader(),
      new StandardJsonLoader(),
      new MarkdownLoader(),
    ];

    this.searchIndex = searchIndex ?? new MiniSearchAdapter<SnippetMetadata & Record<string, unknown>>({
      fields: ['title', 'description', 'keywords', 'scope', 'prefix'],
      storeFields: ['prefix', 'title', 'description', 'scope', 'keywords'],
      idField: 'prefix',
      searchOptions: {
        boost: { title: 2, keywords: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    }) as ISearchIndex<SnippetMetadata>;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.assertSnippetsDir();
      await this.loadSnippetsFromDir(this.snippetsDir);
      this.finalizeIndex();
    } catch (error) {
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

  public listSnippetMetadata(scope?: string): SnippetMetadata[] {
    const allSnippets = Array.from(this.snippets.values()).map((snippet) => snippet.metadata);
    if (!scope) {
      return allSnippets;
    }
    const normalizedScopeToken = normalizeScope(scope);
    return allSnippets.filter((metadata) => matchesScope(metadata.scope, normalizedScopeToken));
  }

  public async getSnippetContent(prefix: string): Promise<string> {
    const snippet = this.snippets.get(prefix);
    if (snippet === undefined) {
      throw new Error(`Snippet not found: ${prefix}`);
    }

    if (snippet.content !== undefined) {
      return snippet.content;
    }

    if (snippet.loader?.getContent && snippet.filePath) {
      const content = await snippet.loader.getContent(snippet.filePath, prefix);
      if (content !== undefined) {
        return content;
      }
    }

    throw new Error(`Unable to load content for snippet: ${prefix}`);
  }

  public async getSnippet(prefix: string): Promise<Snippet> {
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

  public searchSnippets(query: string, limit: number = 5, scope?: string): SnippetMetadata[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results = this.searchIndex.search(query);
    const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 5;
    if (normalizedLimit <= 0) {
      return [];
    }
    const normalizedScopeToken = scope !== undefined ? normalizeScope(scope) : undefined;

    const matches: SnippetMetadata[] = [];
    for (const result of results) {
      if (matches.length >= normalizedLimit) {
        break;
      }

      const prefix = String(result['prefix']);
      const snippet = this.snippets.get(prefix);
      if (snippet === undefined) {
        throw new Error(`Search index out of sync: snippet ${prefix} not found`);
      }

      if (normalizedScopeToken !== undefined && !matchesScope(snippet.metadata.scope, normalizedScopeToken)) {
        continue;
      }

      matches.push(snippet.metadata);
    }

    return matches;
  }
}
