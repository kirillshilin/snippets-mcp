import { SnippetService } from '../src/services/snippet-service.js';

describe('SnippetService', () => {
  let service: SnippetService;

  beforeEach(() => {
    service = new SnippetService();
  });

  describe('listSnippets', () => {
    it('should return an empty array when no snippets exist', () => {
      const snippets = service.listSnippets();
      expect(snippets).toEqual([]);
    });

    // TODO: Add more tests
  });

  describe('getSnippet', () => {
    it('should throw an error when snippet does not exist', () => {
      expect(() => service.getSnippet('non-existent')).toThrow('Snippet not found');
    });

    // TODO: Add more tests
  });

  describe('searchSnippets', () => {
    it('should return an empty array when no snippets match', () => {
      const results = service.searchSnippets('test');
      expect(results).toEqual([]);
    });

    // TODO: Add more tests
  });
});
