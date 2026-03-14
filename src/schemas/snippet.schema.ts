import { z } from 'zod';

export const snippetMetadataSchema = z.object({
  prefix: z.string().describe('Key used to trigger snippet'),
  title: z.string().describe('Title of the snippet'),
  keywords: z.array(z.string()).describe('Keywords associated with the snippet'),
  scope: z.array(z.string()).describe('Languages or file extensions'),
  description: z.string().describe('Description of the snippet'),
});

export const snippetSchema = snippetMetadataSchema.extend({
  content: z.string().describe('The actual snippet code/text'),
});

export const snippetOverviewSchema = z.object({
  prefix: z.string().describe('Key used to trigger snippet'),
  title: z.string().describe('Title of the snippet'),
  description: z.string().describe('Description of the snippet'),
});
