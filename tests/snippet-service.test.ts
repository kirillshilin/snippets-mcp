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
        scope: ['javascript', 'typescript'],
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
        scope: ['javascript'],
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

    it('should filter snippets by scope', async () => {
      await writeFile(
        join(testSnippetsDir, 'js-snip.json'),
        JSON.stringify({
          prefix: 'jssnip',
          title: 'JS Snippet',
          keywords: [],
          scope: 'javascript',
          description: 'JavaScript snippet',
          content: 'js();',
        }),
      );

      await writeFile(
        join(testSnippetsDir, 'ts-snip.json'),
        JSON.stringify({
          prefix: 'tssnip',
          title: 'TS Snippet',
          keywords: [],
          scope: 'typescript',
          description: 'TypeScript snippet',
          content: 'ts();',
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata('typescript');

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.prefix).toBe('tssnip');
    });

    it('should filter snippets by scope with dot prefix', async () => {
      await writeFile(
        join(testSnippetsDir, 'ts-snip.json'),
        JSON.stringify({
          prefix: 'tssnip',
          title: 'TS Snippet',
          keywords: [],
          scope: 'ts',
          description: 'TypeScript snippet',
          content: 'ts();',
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata('.ts');

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.prefix).toBe('tssnip');
    });

    it('should return empty array when no snippets match the scope', async () => {
      await writeFile(
        join(testSnippetsDir, 'js-snip.json'),
        JSON.stringify({
          prefix: 'jssnip',
          title: 'JS Snippet',
          keywords: [],
          scope: 'javascript',
          description: 'JavaScript snippet',
          content: 'js();',
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata('python');

      expect(metadata).toEqual([]);
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
        scope: ['javascript'],
        description: 'A test snippet',
        content: 'console.log("test");',
      };
      await writeFile(snippetPath, JSON.stringify(snippetData));

      await service.initialize();
      const snippet = await service.getSnippet('test');

      expect(snippet).toEqual(snippetData);
    });
  });

  describe('searchSnippets', () => {
    beforeEach(async () => {
      // Create multiple test snippets with different content
      await writeFile(
        join(testSnippetsDir, 'for-loop.json'),
        JSON.stringify({
          prefix: 'for',
          title: 'For Loop',
          keywords: ['loop', 'iteration', 'array'],
          scope: 'javascript,typescript',
          description: 'Standard for loop structure',
          content: 'for (let i = 0; i < array.length; i++) {}',
        }),
      );

      await writeFile(
        join(testSnippetsDir, 'arrow-function.json'),
        JSON.stringify({
          prefix: 'arrowfn',
          title: 'Arrow Function',
          keywords: ['function', 'arrow', 'lambda'],
          scope: 'javascript,typescript',
          description: 'Arrow function definition',
          content: 'const fn = () => {};',
        }),
      );

      await writeFile(
        join(testSnippetsDir, 'hello-world.json'),
        JSON.stringify({
          prefix: 'hello',
          title: 'Hello World',
          keywords: ['greeting', 'print', 'console'],
          scope: 'javascript,typescript',
          description: 'Prints Hello World to the console',
          content: 'console.log("Hello, World!");',
        }),
      );

      await service.initialize();
    });

    it('should return empty array for empty query', async () => {
      const results = service.searchSnippets('');
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = service.searchSnippets('   ');
      expect(results).toEqual([]);
    });

    it('should search by title', async () => {
      const results = service.searchSnippets('Arrow Function');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.prefix === 'arrowfn')).toBe(true);
    });

    it('should search by keyword', async () => {
      const results = service.searchSnippets('loop');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.prefix === 'for')).toBe(true);
    });

    it('should search by description', async () => {
      const results = service.searchSnippets('console');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.prefix === 'hello')).toBe(true);
    });

    it('should search by scope', async () => {
      const results = service.searchSnippets('typescript', 10);
      expect(results.length).toBeGreaterThan(0);
      // All test snippets have typescript in scope
      expect(results.length).toBe(3);
    });

    it('should support fuzzy search', async () => {
      // "functoin" is a typo for "function"
      const results = service.searchSnippets('functoin');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.prefix === 'arrowfn')).toBe(true);
    });

    it('should support prefix search', async () => {
      // Partial word search
      const results = service.searchSnippets('arr');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.prefix === 'arrowfn')).toBe(true);
    });

    it('should return snippets ranked by relevance', async () => {
      // "loop" appears in both keywords and title for for-loop
      const results = service.searchSnippets('loop');
      expect(results.length).toBeGreaterThan(0);
      // The for-loop snippet should be in results
      expect(results.some((r) => r.prefix === 'for')).toBe(true);
    });

    it('should return no results for non-matching query', async () => {
      const results = service.searchSnippets('nonexistent-query-xyz');
      expect(results).toEqual([]);
    });
  });

  describe('VS Code snippet format support', () => {
    it('should load VS Code .code-snippet files', async () => {
      // Create a VS Code format snippet file
      const snippetPath = join(testSnippetsDir, 'angular.code-snippet');
      const vsCodeSnippet = {
        'Angular - ngOnChanges': {
          scope: 'typescriptangular,typescript,ts,angular,angularts',
          prefix: 'ngchange',
          description: 'Creates ngOnChanges',
          body: [
            'ngOnChanges(changes: SimpleChanges) {',
            "\tif(this.${1} && '${1}' in changes) {",
            '\t\t${0}',
            '\t}',
            '}',
          ],
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        prefix: 'ngchange',
        title: 'Angular - ngOnChanges',
        description: 'Creates ngOnChanges',
        scope: ['typescriptangular', 'typescript', 'ts', 'angular', 'angularts'],
        keywords: [],
      });
    });

    it('should load multiple snippets from a single VS Code file', async () => {
      const snippetPath = join(testSnippetsDir, 'multiple.code-snippet');
      const vsCodeSnippets = {
        'Print to console': {
          scope: 'javascript,typescript',
          prefix: 'log',
          body: ["console.log('$1');", '$2'],
          description: 'Log output to console',
        },
        'Arrow Function': {
          scope: 'javascript,typescript',
          prefix: 'arrowfn',
          body: ['const ${1:name} = (${2:params}) => {', '\t$0', '}'],
          description: 'Arrow function',
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippets, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(2);
      expect(metadata.some((m) => m.prefix === 'log')).toBe(true);
      expect(metadata.some((m) => m.prefix === 'arrowfn')).toBe(true);
    });

    it('should get content from VS Code snippets', async () => {
      const snippetPath = join(testSnippetsDir, 'test.code-snippet');
      const vsCodeSnippet = {
        'Test Snippet': {
          prefix: 'test',
          scope: 'javascript',
          description: 'Test',
          body: ['line1', 'line2', 'line3'],
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const content = await service.getSnippetContent('test');

      expect(content).toBe('line1\nline2\nline3');
    });

    it('should handle VS Code snippets with string body', async () => {
      const snippetPath = join(testSnippetsDir, 'string-body.code-snippet');
      const vsCodeSnippet = {
        'String Body': {
          prefix: 'strbody',
          scope: 'javascript',
          description: 'String body',
          body: 'single line content',
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const content = await service.getSnippetContent('strbody');

      expect(content).toBe('single line content');
    });

    it('should handle VS Code snippets with array prefix', async () => {
      const snippetPath = join(testSnippetsDir, 'array-prefix.code-snippet');
      const vsCodeSnippet = {
        'Array Prefix': {
          prefix: ['pfx1', 'pfx2'],
          scope: 'javascript',
          description: 'Array prefix',
          body: ['code'],
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.prefix).toBe('pfx1');
    });

    it('should handle VS Code snippets without scope', async () => {
      const snippetPath = join(testSnippetsDir, 'no-scope.code-snippet');
      const vsCodeSnippet = {
        'No Scope': {
          prefix: 'noscope',
          body: ['code'],
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.scope).toEqual([]);
    });

    it('should handle VS Code snippets without description', async () => {
      const snippetPath = join(testSnippetsDir, 'no-description.code-snippet');
      const vsCodeSnippet = {
        'No Description': {
          prefix: 'nodesc',
          scope: 'javascript',
          body: ['code'],
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.description).toBe('');
    });

    it('should support both .json and .code-snippet files simultaneously', async () => {
      // Create standard format file
      await writeFile(
        join(testSnippetsDir, 'standard.json'),
        JSON.stringify({
          prefix: 'std',
          title: 'Standard',
          keywords: ['test'],
          scope: 'javascript',
          description: 'Standard format',
          content: 'standard();',
        }),
      );

      // Create VS Code format file
      await writeFile(
        join(testSnippetsDir, 'vscode.code-snippet'),
        JSON.stringify({
          'VS Code Snippet': {
            prefix: 'vsc',
            scope: 'javascript',
            description: 'VS Code format',
            body: ['vscode();'],
          },
        }),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(2);
      expect(metadata.some((m) => m.prefix === 'std')).toBe(true);
      expect(metadata.some((m) => m.prefix === 'vsc')).toBe(true);
    });

    it('should skip VS Code snippets with invalid format', async () => {
      const snippetPath = join(testSnippetsDir, 'invalid.code-snippet');
      const vsCodeSnippet = {
        'Valid Snippet': {
          prefix: 'valid',
          body: ['code'],
        },
        'Invalid Snippet': {
          // Missing prefix and body
          scope: 'javascript',
        },
      };
      await writeFile(snippetPath, JSON.stringify(vsCodeSnippet, null, 2));

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.prefix).toBe('valid');
    });
  });

  describe('Markdown snippet format support', () => {
    const makeMarkdown = (
      frontMatter: string,
      codeBlock: string,
      lang: string = 'javascript',
    ): string => `---\n${frontMatter}\n---\n\`\`\`${lang}\n${codeBlock}\n\`\`\`\n`;

    it('should load a basic .md snippet file', async () => {
      const content = makeMarkdown(
        'prefix: mdsnip\ntitle: MD Snippet\nscope: javascript\ndescription: A markdown snippet\nkeywords: md, test',
        'console.log("md");',
      );
      await writeFile(join(testSnippetsDir, 'basic.md'), content);

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        prefix: 'mdsnip',
        title: 'MD Snippet',
        scope: ['javascript'],
        description: 'A markdown snippet',
        keywords: ['md', 'test'],
      });
    });

    it('should return content from the first code block', async () => {
      const code = 'const x = 42;';
      const content = makeMarkdown(
        'prefix: mdcontent\ntitle: MD Content\nscope: typescript\ndescription: Content test',
        code,
        'typescript',
      );
      await writeFile(join(testSnippetsDir, 'content.md'), content);

      await service.initialize();
      const retrieved = await service.getSnippetContent('mdcontent');

      expect(retrieved).toBe(code);
    });

    it('should support YAML inline array syntax for keywords', async () => {
      const content = makeMarkdown(
        'prefix: inlinekeys\ntitle: Inline Keys\nscope: javascript\ndescription: Inline keywords\nkeywords: [foo, bar, baz]',
        'foo();',
      );
      await writeFile(join(testSnippetsDir, 'inline-keys.md'), content);

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.keywords).toEqual(['foo', 'bar', 'baz']);
    });

    it('should handle missing optional fields with defaults', async () => {
      const content = makeMarkdown('prefix: minimal\ntitle: Minimal', 'minimal();');
      await writeFile(join(testSnippetsDir, 'minimal.md'), content);

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        prefix: 'minimal',
        title: 'Minimal',
        scope: [],
        description: '',
        keywords: [],
      });
    });

    it('should skip .md files without front matter', async () => {
      await writeFile(join(testSnippetsDir, 'no-frontmatter.md'), '# Just a heading\nsome text');

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toEqual([]);
    });

    it('should skip .md files without a code block', async () => {
      const content = '---\nprefix: nocode\ntitle: No Code\n---\nJust text, no code block.\n';
      await writeFile(join(testSnippetsDir, 'no-code.md'), content);

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toEqual([]);
    });

    it('should skip .md files missing prefix', async () => {
      const content = makeMarkdown(
        'title: No Prefix\nscope: javascript\ndescription: Missing prefix',
        'code();',
      );
      await writeFile(join(testSnippetsDir, 'no-prefix.md'), content);

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toEqual([]);
    });

    it('should read content on-demand from .md file', async () => {
      const mdPath = join(testSnippetsDir, 'ondemand.md');
      await writeFile(
        mdPath,
        makeMarkdown(
          'prefix: ondemand\ntitle: On Demand\nscope: javascript\ndescription: Test',
          'original();',
        ),
      );

      await service.initialize();

      // Modify the file after initialization
      await writeFile(
        mdPath,
        makeMarkdown(
          'prefix: ondemand\ntitle: On Demand\nscope: javascript\ndescription: Test',
          'modified();',
        ),
      );

      const retrieved = await service.getSnippetContent('ondemand');
      expect(retrieved).toBe('modified();');
    });

    it('should load .md alongside .json snippets', async () => {
      await writeFile(
        join(testSnippetsDir, 'json-snip.json'),
        JSON.stringify({
          prefix: 'jsonsnip',
          title: 'JSON Snippet',
          keywords: [],
          scope: 'javascript',
          description: 'JSON format',
          content: 'json();',
        }),
      );
      await writeFile(
        join(testSnippetsDir, 'md-snip.md'),
        makeMarkdown(
          'prefix: mdsnip2\ntitle: MD Snippet 2\nscope: javascript\ndescription: MD format',
          'md();',
        ),
      );

      await service.initialize();
      const metadata = service.listSnippetMetadata();

      expect(metadata).toHaveLength(2);
      expect(metadata.some((m) => m.prefix === 'jsonsnip')).toBe(true);
      expect(metadata.some((m) => m.prefix === 'mdsnip2')).toBe(true);
    });
  });
});
