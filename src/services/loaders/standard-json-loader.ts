import { readFile } from 'node:fs/promises';
import type { SnippetLoader, LoadedSnippet } from './snippet-loader.js';
import type { SnippetMetadata } from '../../types/snippet.js';

/**
 * Loader for standard JSON snippet format
 * One snippet per file with all metadata and content in a single JSON object
 * Content is loaded on-demand to allow file modifications to be reflected
 */
export class StandardJsonLoader implements SnippetLoader {
  canHandle(_filePath: string, fileExtension: string): boolean {
    return fileExtension === '.json';
  }

  loadSnippets(filePath: string, fileContent: string): LoadedSnippet[] {
    const data = JSON.parse(fileContent) as Record<string, unknown>;

    // Check if this is standard format (has prefix and title at top level)
    if (!('prefix' in data && 'title' in data)) {
      // Not standard format
      return [];
    }

    // Validate required fields
    if (typeof data['prefix'] !== 'string' || data['prefix'].length === 0) {
      throw new Error('Invalid or missing prefix field');
    }
    if (typeof data['title'] !== 'string' || data['title'].length === 0) {
      throw new Error('Invalid or missing title field');
    }
    if (typeof data['description'] !== 'string') {
      throw new Error('Invalid or missing description field');
    }
    const scope = this.parseScope(data['scope']);
    if (scope.length === 0) {
      throw new Error('Invalid or missing scope field');
    }
    if (typeof data['content'] !== 'string') {
      throw new Error('Invalid or missing content field');
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

    const metadata: SnippetMetadata = {
      prefix: data['prefix'],
      title: data['title'],
      description: data['description'],
      scope,
      keywords,
    };

    // Return metadata without content - content will be loaded on-demand
    return [
      {
        metadata,
        filePath, // Store file path for on-demand loading
      },
    ];
  }

  /**
   * Get content on-demand from the file
   */
  async getContent(filePath: string, _prefix: string): Promise<string | undefined> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, unknown>;

      if (typeof data['content'] !== 'string') {
        return undefined;
      }

      return data['content'];
    } catch {
      return undefined;
    }
  }

  private parseScope(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((scope): scope is string => typeof scope === 'string' && scope.length > 0);
    }

    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0);
    }

    return [];
  }
}
