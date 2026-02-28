import { readFile } from 'node:fs/promises';
import type { SnippetLoader, LoadedSnippet } from './snippet-loader.js';
import type { SnippetMetadata } from '../../types/snippet.js';

/**
 * Loader for Markdown snippet format (.md files)
 * Expects YAML front matter at the top with prefix, title, scope, keywords, and description,
 * followed by a fenced code block containing the snippet content.
 *
 * Example:
 * ---
 * prefix: mysnippet
 * title: My Snippet
 * scope: javascript,typescript
 * keywords: loop, iteration
 * description: A useful snippet
 * ---
 * ```javascript
 * const x = 1;
 * ```
 */
export class MarkdownLoader implements SnippetLoader {
  canHandle(_filePath: string, fileExtension: string): boolean {
    return fileExtension === '.md';
  }

  loadSnippets(filePath: string, fileContent: string): LoadedSnippet[] {
    const parsed = this.parse(fileContent);
    if (parsed === null) {
      return [];
    }

    const { metadata } = parsed;

    // Return metadata without content - content will be loaded on-demand
    return [
      {
        metadata,
        filePath,
      },
    ];
  }

  /**
   * Get content on-demand from the file
   */
  async getContent(filePath: string, _prefix: string): Promise<string | undefined> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const parsed = this.parse(fileContent);
      return parsed?.content;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse a markdown file with YAML front matter and a fenced code block.
   * Returns metadata and content, or null if the file is not in the expected format.
   */
  private parse(fileContent: string): { metadata: SnippetMetadata; content: string } | null {
    // Must start with ---
    if (!fileContent.startsWith('---')) {
      return null;
    }

    const endOfFrontMatter = fileContent.indexOf('\n---', 3);
    if (endOfFrontMatter === -1) {
      return null;
    }

    const frontMatter = fileContent.slice(3, endOfFrontMatter).trim();
    const body = fileContent.slice(endOfFrontMatter + 4); // skip \n---

    const fields = this.parseFrontMatter(frontMatter);

    const prefix = fields['prefix'];
    const title = fields['title'];

    if (!prefix || !title) {
      return null;
    }

    const scope = this.parseScope(fields['scope']);
    const description = fields['description'] ?? '';
    const keywords = this.parseKeywords(fields['keywords']);

    const content = this.extractCodeBlock(body);
    if (content === null) {
      return null;
    }

    const metadata: SnippetMetadata = { prefix, title, scope, description, keywords };
    return { metadata, content };
  }

  /**
   * Parse YAML-style front matter into a key-value map.
   * Supports simple `key: value` pairs only.
   */
  private parseFrontMatter(frontMatter: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of frontMatter.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Parse keywords from a string.
   * Supports comma-separated values and YAML inline arrays: [a, b, c]
   */
  private parseKeywords(raw: string | undefined): string[] {
    if (!raw) {
      return [];
    }

    // Handle YAML inline array syntax: [foo, bar, baz]
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    // Handle comma-separated string
    return trimmed
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  /**
   * Parse scope from a string.
   * Supports comma-separated values and YAML inline arrays: [a, b, c]
   */
  private parseScope(raw: string | undefined): string[] {
    if (!raw) {
      return [];
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0);
    }

    return trimmed
      .split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  /**
   * Extract the content of the first fenced code block from markdown body.
   * Returns null if no code block is found.
   */
  private extractCodeBlock(body: string): string | null {
    const fenceStart = body.indexOf('```');
    if (fenceStart === -1) {
      return null;
    }

    const afterFence = body.indexOf('\n', fenceStart);
    if (afterFence === -1) {
      return null;
    }

    const fenceEnd = body.indexOf('\n```', afterFence);
    if (fenceEnd === -1) {
      return null;
    }

    return body.slice(afterFence + 1, fenceEnd);
  }
}
