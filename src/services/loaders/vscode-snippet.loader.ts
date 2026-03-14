import type { SnippetLoader, LoadedSnippet } from './snippet.loader.js';
import type { SnippetMetadata } from '../../types/snippet.types.js';

/**
 * Loader for VS Code snippet format (.code-snippet files)
 * Supports multiple snippets per file
 */
export class VSCodeSnippetLoader implements SnippetLoader {
  canHandle(_filePath: string, fileExtension: string): boolean {
    // Handle both .code-snippet and .json files that contain VS Code format
    return fileExtension === '.code-snippet' || fileExtension === '.json';
  }

  loadSnippets(filePath: string, fileContent: string): LoadedSnippet[] {
    const data = JSON.parse(fileContent) as Record<string, unknown>;
    const snippets: LoadedSnippet[] = [];

    // Check if this looks like VS Code format
    if (!this.isVSCodeFormat(data)) {
      return [];
    }

    // Parse each snippet in the file
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
          // Skip snippets without valid prefix
          continue;
        }

        // Parse scope - default to empty array if not present
        const scope = this.parseScope(snippet['scope']);

        // Parse description - default to empty string if not present
        const description =
          typeof snippet['description'] === 'string' ? snippet['description'] : '';

        // Parse body - must be string array or string
        let content: string;
        if (Array.isArray(snippet['body'])) {
          content = snippet['body']
            .filter((line): line is string => typeof line === 'string')
            .join('\n');
        } else if (typeof snippet['body'] === 'string') {
          content = snippet['body'];
        } else {
          // Skip snippets without valid body
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

        snippets.push({
          metadata,
          content, // Store content in memory for VS Code snippets
        });
      } catch (error) {
        console.error(`Failed to parse snippet ${snippetName} from ${filePath}:`, error);
        // Continue with other snippets
      }
    }

    return snippets;
  }

  /**
   * Check if data represents a VS Code snippet file format
   * VS Code snippets don't have 'prefix' and 'title' at top level
   */
  private isVSCodeFormat(data: Record<string, unknown>): boolean {
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

  private parseScope(raw: unknown): string[] {
    if (typeof raw !== 'string') {
      return [];
    }

    return raw
      .split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
}
