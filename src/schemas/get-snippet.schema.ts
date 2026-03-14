import { z } from 'zod';
import { snippetSchema } from './snippet.schema.js';

export const getSnippetInputSchema = z.object({
  prefix: z.string().describe('The ID of the snippet to retrieve'),
});

export const getSnippetOutputSchema = z.object({
  snippet: snippetSchema,
});
