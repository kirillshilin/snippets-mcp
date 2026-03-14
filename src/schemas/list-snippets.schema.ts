import { z } from 'zod';
import { snippetOverviewSchema } from './snippet.schema.js';

export const listSnippetsInputSchema = z.object({
  scope: z
    .string()
    .optional()
    .describe(
      'Filter by scope (language or file extension, e.g. ts, .ts, typescript). Infer from the open file extension, the project type, or the language of the majority of files in the project.',
    ),
});

export const listSnippetsOutputSchema = z.object({
  snippets: z.array(snippetOverviewSchema),
});
