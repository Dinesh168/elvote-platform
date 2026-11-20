import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import { env } from './config.js';
import { core } from './db/pools.js';
import { assertUserActive } from './lib/access.js';
import { verifyAccess } from './lib/auth.js';
import { ApiError } from './lib/errors.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { fieldRoutes } from './routes/field.js';
import { meRoutes } from './routes/me.js';
import { UPLOAD_DIR } from './routes/customers.js';
import { platformRoutes } from './routes/platform.js';
import { pollingRoutes } from './routes/polling.js';

const PUBLIC = ['/health', '/ready', '/v1/auth/', '/files/'];

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: 'info', redact: ['req.headers.authorization'] },
    bodyLimit: 1024 * 1024,
    trustProxy: env.NODE_ENV === 'production' ? '127.0.0.1' : false,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['authorization', 'content-type'],
    credentials: false,
  });
  await app.register(multipart);

  app.decorateRequest('userId', '');
  app.addHook('onRequest', async (req) => {
    const path = req.url.split('?')[0];
    if (req.method === 'OPTIONS' || PUBLIC.some((p) => path === p || (p.endsWith('/') && path.startsWith(p)))) return;
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw new ApiError(401, 'unauthorized', 'Sign in again.');
    req.userId = await verifyAccess(h.slice(7));
    await assertUserActive(req.userId);
  });

  app.setErrorHandler((e, req, reply) => {
    const err = e as Error & { statusCode?: number };
    if (err instanceof ApiError) return reply.status(err.status).send({ error: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) });
    const status = err.statusCode;
    if (status && status < 500) return reply.status(status).send({ error: 'bad_request', message: err.message });
    req.log.error({ err: { message: err.message, stack: err.stack } }, 'unhandled');
    return reply.status(500).send({ error: 'server_error', message: 'Something went wrong. Try again.' });
  });

  // Customer logos and candidate photos (public images; names are random). Spec customer-cms.
  app.get('/files/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    if (!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(name)) throw new ApiError(404, 'not_found', 'Not found.');
    const file = path.join(UPLOAD_DIR, name);
    if (!existsSync(file)) throw new ApiError(404, 'not_found', 'Not found.');
    const ext = name.split('.').pop();
    return reply
      .header('content-type', ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
      .header('cache-control', 'public, max-age=31536000, immutable')
      .header('cross-origin-resource-policy', 'cross-origin')
      .header('x-content-type-options', 'nosniff')
      .send(readFileSync(file));
  });

  app.get('/health', async () => ({ ok: true }));
  app.get('/ready', async () => {
    await core.query('SELECT 1');
    return { ok: true };
  });

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(fieldRoutes);
  await app.register(adminRoutes);
  await app.register(pollingRoutes);
  await app.register(platformRoutes);
  return app;
}
