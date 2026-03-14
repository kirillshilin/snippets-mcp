import { createServer } from './snippets.api.js';
import type { Express } from 'express';
import request from 'supertest';

describe('API Parameter Validation', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  describe('GET /api/snippets/search', () => {
    it('should return 400 when query parameter "q" is missing', async () => {
      const response = await request(app).get('/api/snippets/search');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request parameters');
      // Zod returns "Required" when a required field is missing
      expect(response.body.details).toContain('Required');
    });

    it('should return 400 when query parameter "q" is empty', async () => {
      const response = await request(app).get('/api/snippets/search?q=');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request parameters');
      expect(response.body.details).toContain(
        'Query parameter "q" is required and cannot be empty',
      );
    });

    it('should use default limit of 1 when limit is not provided', async () => {
      const response = await request(app).get('/api/snippets/search?q=test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('limit', 1);
      expect(response.body).toHaveProperty('query', 'test');
    });

    it('should parse limit parameter correctly', async () => {
      const response = await request(app).get('/api/snippets/search?q=test&limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('limit', 5);
    });

    it('should return 400 when limit is not a valid number', async () => {
      const response = await request(app).get('/api/snippets/search?q=test&limit=abc');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request parameters');
      expect(response.body.details).toContain(
        'Query parameter "limit" must be a valid positive number',
      );
    });

    it('should return 400 when limit is zero', async () => {
      const response = await request(app).get('/api/snippets/search?q=test&limit=0');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request parameters');
    });

    it('should return 400 when limit is negative', async () => {
      const response = await request(app).get('/api/snippets/search?q=test&limit=-1');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request parameters');
    });

    it('should successfully search with valid parameters', async () => {
      const response = await request(app).get('/api/snippets/search?q=function&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('query', 'function');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe('GET /api/snippets/:prefix', () => {
    it('should return 404 when snippet does not exist', async () => {
      const response = await request(app).get('/api/snippets/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Snippet not found');
    });

    it('should validate prefix parameter', async () => {
      // Note: Express doesn't call the handler if the parameter is completely missing
      // This test verifies that our schema handles the parameter correctly
      const response = await request(app).get('/api/snippets/validprefix');

      // Will return 404 if snippet doesn't exist, which is expected
      // The important part is it doesn't return 400 for parameter validation
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/snippets', () => {
    it('should list all snippets', async () => {
      const response = await request(app).get('/api/snippets');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('snippets');
      expect(Array.isArray(response.body.snippets)).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
