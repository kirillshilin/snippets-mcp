import type { SnippetMetadata } from '../../types/snippet.types.js';

/**
 * Loaded snippet data with metadata and optional content
 */
export interface LoadedSnippet {
  metadata: SnippetMetadata;
  content?: string; // Optional - if not provided, content will be read on-demand
  filePath?: string; // For on-demand loading
}

/**
 * Base interface for snippet loaders
 * Each loader is responsible for parsing a specific snippet format
 */
export interface SnippetLoader {
  /**
   * Check if this loader can handle the given file
   * @param filePath - Path to the file
   * @param fileExtension - File extension (e.g., '.json', '.code-snippet')
   * @returns true if this loader can handle the file
   */
  canHandle(filePath: string, fileExtension: string): boolean;

  /**
   * Load snippets from a file
   * @param filePath - Path to the file
   * @param fileContent - Content of the file
   * @returns Array of loaded snippets
   */
  loadSnippets(filePath: string, fileContent: string): LoadedSnippet[];

  /**
   * Get content for a specific snippet (for on-demand loading)
   * @param filePath - Path to the file
   * @param prefix - Snippet prefix
   * @returns Content of the snippet, or undefined if not supported
   */
  getContent?(filePath: string, prefix: string): Promise<string | undefined>;
}
