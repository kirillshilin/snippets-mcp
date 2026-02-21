import { createServer } from '../src/api.js';
import type { Express } from 'express';
import request from 'supertest';
import { config } from '../src/config.js';

describe('Bearer Token Authentication', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  describe('when AUTH_TOKEN is not set', () => {
    beforeEach(() => {
      config.authToken = undefined;
    });

    it('should allow access to /api/snippets without a token', async () => {
      const response = await request(app).get('/api/snippets');
      expect(response.status).toBe(200);
    });

    it('should allow access to /health without a token', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('when AUTH_TOKEN is set', () => {
    const testToken = 'test-secret-token';

    beforeEach(() => {
      config.authToken = testToken;
    });

    afterEach(() => {
      config.authToken = undefined;
    });

    it('should return 401 when no Authorization header is provided', async () => {
      const response = await request(app).get('/api/snippets');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 when Authorization header is not Bearer scheme', async () => {
      const response = await request(app)
        .get('/api/snippets')
        .set('Authorization', `Basic ${testToken}`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 when token is incorrect', async () => {
      const response = await request(app)
        .get('/api/snippets')
        .set('Authorization', 'Bearer wrong-token');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should allow access when correct Bearer token is provided', async () => {
      const response = await request(app)
        .get('/api/snippets')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
    });

    it('should allow access to /health without a token', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });
  });
});
