import { SnippetService } from '../src/services/snippet-service.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SnippetService', () => {
  let service: SnippetService;
  let testSnippetsDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test snippets
    testSnippetsDir = join(tmpdir(), `snippets-test-${Date.now()}`);
    await mkdir(testSnippetsDir, { recursive: true });
    service = new SnippetService(testSnippetsDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testSnippetsDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should initialize with empty snippets when directory is empty', async () => {
      await service.initialize();
      const metadata = service.listSnippetMetadata();
      expect(metadata).toEqual([]);
    });

    it('should load snippet metadata from JSON files', async () => {
      // Create a test snippet file
      const snippetPath = join(testSnippetsDir, 'test-snippet.json');
      const snippetData = {
        prefix: 'test',
        title: 'Test Snippet',
        keywords: ['test', 'example'],
        scope: 'javascript,typescript',
        description: 'A test snippet',
        content: 'console.log("test");',
      };
      await writeFile(snippetPath, JSON.stringify(snippetData, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        prefix: 'test',
        title: 'Test Snippet',
        keywords: ['test', 'example'],
        scope: 'javascript,typescript',
        description: 'A test snippet',
      });
    });

    it('should skip non-JSON files', async () => {
      await writeFile(join(testSnippetsDir, 'readme.txt'), 'Not a snippet');
      await service.initialize();
      const metadata = service.listSnippetMetadata();
      expect(metadata).toEqual([]);
    });

    it('should handle snippets without keywords', async () => {
      const snippetPath = join(testSnippetsDir, 'no-keywords.json');
      const snippetData = {
        prefix: 'nok',
        title: 'No Keywords',
        scope: 'javascript',
        description: 'Snippet without keywords',
        content: 'console.log("no keywords");',
      };
      await writeFile(snippetPath, JSON.stringify(snippetData, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.keywords).toEqual([]);
    });

    it('should skip invalid snippet files and continue loading', async () => {
      // Create one valid and one invalid snippet
      const validPath = join(testSnippetsDir, 'valid.json');
      const invalidPath = join(testSnippetsDir, 'invalid.json');

      await writeFile(
        validPath,
        JSON.stringify({
          prefix: 'valid',
          title: 'Valid Snippet',
          scope: 'javascript',
          description: 'A valid snippet',
          content: 'valid();',
        }),
      );

      await writeFile(invalidPath, '{ invalid json }');

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.prefix).toBe('valid');
    });
  });

  describe('listSnippetMetadata', () => {
    it('should return an empty array when no snippets exist', async () => {
      await service.initialize();
      const metadata = service.listSnippetMetadata();
      expect(metadata).toEqual([]);
    });

    it('should return metadata without content', async () => {
      const snippetPath = join(testSnippetsDir, 'test.json');
      await writeFile(
        snippetPath,
        JSON.stringify({
          prefix: 'test',
          title: 'Test',
          keywords: ['test'],
          scope: 'javascript',
          description: 'Test snippet',
          content: 'console.log("test");',
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).not.toHaveProperty('content');
      expect(metadata[0]).toEqual({
        prefix: 'test',
        title: 'Test',
        keywords: ['test'],
        scope: 'javascript',
        description: 'Test snippet',
      });
    });

    it('should return multiple snippet metadata', async () => {
      await writeFile(
        join(testSnippetsDir, 'snippet1.json'),
        JSON.stringify({
          prefix: 'snip1',
          title: 'Snippet 1',
          keywords: [],
          scope: 'javascript',
          description: 'First snippet',
          content: 'code1();',
        }),
      );

      await writeFile(
        join(testSnippetsDir, 'snippet2.json'),
        JSON.stringify({
          prefix: 'snip2',
          title: 'Snippet 2',
          keywords: [],
          scope: 'typescript',
          description: 'Second snippet',
          content: 'code2();',
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(2);
    });
  });

  describe('getSnippetContent', () => {
    it('should throw an error when snippet does not exist', async () => {
      await service.initialize();
      await expect(service.getSnippetContent('non-existent')).rejects.toThrow('Snippet not found');
    });

    it('should return content for existing snippet', async () => {
      const snippetPath = join(testSnippetsDir, 'test.json');
      const content = 'console.log("Hello from test");';
      await writeFile(
        snippetPath,
        JSON.stringify({
          prefix: 'test',
          title: 'Test',
          keywords: [],
          scope: 'javascript',
          description: 'Test snippet',
          content: content,
        }),
      );

      await service.initialize();
      const retrievedContent = await service.getSnippetContent('test');

      expect(retrievedContent).toBe(content);
    });

    it('should read content on demand from file', async () => {
      const snippetPath = join(testSnippetsDir, 'test.json');
      await writeFile(
        snippetPath,
        JSON.stringify({
          prefix: 'test',
          title: 'Test',
          keywords: [],
          scope: 'javascript',
          description: 'Test snippet',
          content: 'original content',
        }),
      );

      await service.initialize();

      // Modify the file after initialization
      await writeFile(
        snippetPath,
        JSON.stringify({
          prefix: 'test',
          title: 'Test',
          keywords: [],
          scope: 'javascript',
          description: 'Test snippet',
          content: 'modified content',
        }),
      );

      // Content should be read fresh from file
      const content = await service.getSnippetContent('test');
      expect(content).toBe('modified content');
    });
  });

  describe('getSnippet', () => {
    it('should throw an error when snippet does not exist', async () => {
      await service.initialize();
      await expect(service.getSnippet('non-existent')).rejects.toThrow('Snippet not found');
    });

    it('should return complete snippet with metadata and content', async () => {
      const snippetPath = join(testSnippetsDir, 'test.json');
      const snippetData = {
        prefix: 'test',
        title: 'Test Snippet',
        keywords: ['test'],
        scope: 'javascript',
        description: 'A test snippet',
        content: 'console.log("test");',
      };
      await writeFile(snippetPath, JSON.stringify(snippetData));

      await service.initialize();
      const snippet = await service.getSnippet('test');

      expect(snippet).toEqual(snippetData);
    });
  });
});
