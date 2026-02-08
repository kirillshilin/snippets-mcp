import { z } from 'zod';

/**
 * Input schema for list_snippets tool
 */
export const listSnippetsInputSchema = z.object({});

/**
 * Input schema for get_snippet tool
 */
export const getSnippetInputSchema = z.object({
  prefix: z.string().describe('The ID of the snippet to retrieve'),
});

/**
 * Input schema for search_snippets tool
 */
export const searchSnippetsInputSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().int().positive().optional().describe('Max results (default 1)'),
});
