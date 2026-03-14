export interface SearchResult extends Record<string, unknown> {
  id: string | number;
  score: number;
  match: Record<string, string[]>;
}

export interface ISearchIndex<T> {
  addAll(documents: T[]): void;
  search(query: string): SearchResult[];
}
