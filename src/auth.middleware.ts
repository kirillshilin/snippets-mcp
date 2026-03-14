import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from './app.config.js';

export function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (config.authToken === undefined) {
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(config.authToken);
  if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
