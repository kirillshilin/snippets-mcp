export interface SnippetMetadata {
  prefix: string; // Key used to trigger snippet
  title: string;
  keywords: string[];
  scope: string[]; // Languages or file extensions
  description: string;
}

export interface Snippet extends SnippetMetadata {
  content: string; // The actual snippet code/text
}
