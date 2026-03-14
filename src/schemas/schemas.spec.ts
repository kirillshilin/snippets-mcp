import { listSnippetsInputSchema, listSnippetsOutputSchema } from './list-snippets.schema.js';
import { getSnippetInputSchema, getSnippetOutputSchema } from './get-snippet.schema.js';
import { searchSnippetsInputSchema, searchSnippetsOutputSchema } from './search-snippets.schema.js';
import { snippetMetadataSchema, snippetOverviewSchema, snippetSchema } from './snippet.schema.js';

describe('Input Schemas', () => {
  it('should validate list_snippets input (empty object)', () => {
    const result = listSnippetsInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate list_snippets input with scope', () => {
    const result = listSnippetsInputSchema.safeParse({ scope: 'typescript' });
    expect(result.success).toBe(true);
  });

  it('should validate get_snippet input with prefix', () => {
    const result = getSnippetInputSchema.safeParse({ prefix: 'test' });
    expect(result.success).toBe(true);
  });

  it('should reject get_snippet input without prefix', () => {
    const result = getSnippetInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate search_snippets input with query', () => {
    const result = searchSnippetsInputSchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
  });

  it('should validate search_snippets input with query and limit', () => {
    const result = searchSnippetsInputSchema.safeParse({ query: 'test', limit: 5 });
    expect(result.success).toBe(true);
  });

  it('should reject search_snippets input with negative limit', () => {
    const result = searchSnippetsInputSchema.safeParse({ query: 'test', limit: -1 });
    expect(result.success).toBe(false);
  });
});

describe('Output Schemas', () => {
  const mockSnippetMetadata = {
    prefix: 'test',
    title: 'Test Snippet',
    keywords: ['test'],
    scope: ['javascript'],
    description: 'A test snippet',
  };

  const mockSnippet = {
    ...mockSnippetMetadata,
    content: 'console.log("test");',
  };

  it('should validate snippet metadata', () => {
    const result = snippetMetadataSchema.safeParse(mockSnippetMetadata);
    expect(result.success).toBe(true);
  });

  it('should validate snippet overview (prefix, title, description)', () => {
    const result = snippetOverviewSchema.safeParse({
      prefix: 'test',
      title: 'Test Snippet',
      description: 'A test snippet',
    });
    expect(result.success).toBe(true);
  });

  it('should reject snippet overview missing required fields', () => {
    const result = snippetOverviewSchema.safeParse({ prefix: 'test' });
    expect(result.success).toBe(false);
  });

  it('should validate complete snippet', () => {
    const result = snippetSchema.safeParse(mockSnippet);
    expect(result.success).toBe(true);
  });

  it('should validate list_snippets output', () => {
    const result = listSnippetsOutputSchema.safeParse({
      snippets: [mockSnippetMetadata],
    });
    expect(result.success).toBe(true);
  });

  it('should validate get_snippet output', () => {
    const result = getSnippetOutputSchema.safeParse({
      snippet: mockSnippet,
    });
    expect(result.success).toBe(true);
  });

  it('should validate search_snippets output', () => {
    const result = searchSnippetsOutputSchema.safeParse({
      snippets: [mockSnippetMetadata],
    });
    expect(result.success).toBe(true);
  });

  it('should reject output with missing required fields', () => {
    const result = snippetSchema.safeParse({
      prefix: 'test',
      // missing other required fields
    });
    expect(result.success).toBe(false);
  });
});
