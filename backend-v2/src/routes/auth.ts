import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logout, refresh, requestOtp, verifyFirebase, verifyOtp } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { Mobile, parse } from '../lib/http.js';

/** accounts-access AC14: at most 20 sign-ins per minute per network address (per API process). */
const hits = new Map<string, { n: number; at: number }>();
function limitSignIn(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 60_000) {
    hits.set(ip, { n: 1, at: now });
    if (hits.size > 50_000) hits.clear();
    return;
  }
  if (++h.n > 20) throw new ApiError(429, 'too_many', 'Too many sign-ins from this network. Try again in a minute.');
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/otp/request', async (req) => {
    const { mobile } = parse(z.object({ mobile: Mobile }), req.body);
    return requestOtp(mobile);
  });

  app.post('/v1/auth/otp/verify', async (req) => {
    const b = parse(z.object({ mobile: Mobile, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'), device: z.string().max(120).optional() }), req.body);
    return verifyOtp(b.mobile, b.code, b.device);
  });

  app.post('/v1/auth/firebase', async (req) => {
    limitSignIn(req.ip);
    const b = parse(z.object({ idToken: z.string().min(20).max(4096), device: z.string().max(120).optional() }), req.body);
    return verifyFirebase(b.idToken, b.device);
  });

  app.post('/v1/auth/refresh', async (req) => {
    const b = parse(z.object({ refreshToken: z.string().min(20).max(200) }), req.body);
    return refresh(b.refreshToken);
  });

  app.post('/v1/auth/logout', async (req) => {
    const b = parse(z.object({ refreshToken: z.string().min(20).max(200) }), req.body);
    await logout(b.refreshToken);
    return { ok: true };
  });
}
