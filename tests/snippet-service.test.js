import { SnippetService } from '../src/services/snippet-service.js';
describe('SnippetService', () => {
    let service;
    beforeEach(() => {
        service = new SnippetService();
    });
    describe('listSnippets', () => {
        it('should return an empty array when no snippets exist', () => {
            const snippets = service.listSnippets();
            expect(snippets).toEqual([]);
        });
    });
    describe('getSnippet', () => {
        it('should throw an error when snippet does not exist', () => {
            expect(() => service.getSnippet('non-existent')).toThrow('Snippet not found');
        });
    });
    describe('searchSnippets', () => {
        it('should return an empty array when no snippets match', () => {
            const results = service.searchSnippets('test');
            expect(results).toEqual([]);
        });
    });
});
//# sourceMappingURL=snippet-service.test.js.map