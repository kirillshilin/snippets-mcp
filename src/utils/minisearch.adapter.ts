import MiniSearch, { type Options } from 'minisearch';
import type { ISearchIndex, SearchResult } from './search-index.js';

export class MiniSearchAdapter<T extends Record<string, unknown>> implements ISearchIndex<T> {
  private readonly index: MiniSearch<T>;

  constructor(options: Options<T>) {
    this.index = new MiniSearch(options);
  }

  addAll(documents: T[]): void {
    this.index.addAll(documents);
  }

  search(query: string): SearchResult[] {
    return this.index.search(query) as SearchResult[];
  }
}
