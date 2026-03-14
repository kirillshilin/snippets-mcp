import { z } from 'zod';
import { snippetMetadataSchema } from './snippet.schema.js';

export const searchSnippetsInputSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().int().positive().optional().describe('Max results (default 1)'),
  scope: z
    .string()
    .optional()
    .describe(
      'Exact scope filter (language or file extension, e.g. ts, .ts, typescript). Infer from the open file extension, the project type, or the language of the majority of files in the project.',
    ),
});

export const searchSnippetsOutputSchema = z.object({
  snippets: z.array(snippetMetadataSchema),
});
