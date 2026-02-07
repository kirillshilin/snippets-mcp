import type { Snippet } from '../types/snippet.js';

export class SnippetService {
  private readonly snippets: ReadonlyMap<string, Snippet>;

  constructor() {
    this.snippets = new Map();
  }

  public listSnippets(): Snippet[] {
    // TODO: Implement actual snippet listing
    return Array.from(this.snippets.values());
  }

  public getSnippet(id: string): Snippet {
    // TODO: Implement actual snippet retrieval
    const snippet = this.snippets.get(id);
    if (snippet === undefined) {
      throw new Error(`Snippet not found: ${id}`);
    }
    return snippet;
  }

  public searchSnippets(query: string): Snippet[] {
    // TODO: Implement actual snippet search
    const results: Snippet[] = [];
    for (const snippet of this.snippets.values()) {
      if (
        snippet.title.toLowerCase().includes(query.toLowerCase()) ||
        snippet.language.toLowerCase().includes(query.toLowerCase()) ||
        snippet.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push(snippet);
      }
    }
    return results;
  }
}
