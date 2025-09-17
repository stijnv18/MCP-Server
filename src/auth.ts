import type { IncomingMessage, ServerResponse } from 'http';
import { apiKey } from './config.js';
import * as Sentry from '@sentry/node';

export function checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const authHeader = req.headers['token'] || req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    Sentry.captureMessage('Unauthorized access attempt', 'warning');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}
