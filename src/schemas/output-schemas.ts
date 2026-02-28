import { z } from 'zod';

/**
 * Schema for snippet metadata (without content)
 */
export const snippetMetadataSchema = z.object({
  prefix: z.string().describe('Key used to trigger snippet'),
  title: z.string().describe('Title of the snippet'),
  keywords: z.array(z.string()).describe('Keywords associated with the snippet'),
  scope: z.array(z.string()).describe('Languages or file extensions'),
  description: z.string().describe('Description of the snippet'),
});

/**
 * Schema for a complete snippet (with content)
 */
export const snippetSchema = snippetMetadataSchema.extend({
  content: z.string().describe('The actual snippet code/text'),
});

/**
 * Output schema for list_snippets tool
 * Returns an array of snippet metadata wrapped in an object
 */
export const listSnippetsOutputSchema = z.object({
  snippets: z.array(snippetMetadataSchema),
});

/**
 * Output schema for get_snippet tool
 * Returns a complete snippet with content wrapped in an object
 */
export const getSnippetOutputSchema = z.object({
  snippet: snippetSchema,
});

/**
 * Output schema for search_snippets tool
 * Returns an array of snippet metadata matching the search query wrapped in an object
 */
export const searchSnippetsOutputSchema = z.object({
  snippets: z.array(snippetMetadataSchema),
});
