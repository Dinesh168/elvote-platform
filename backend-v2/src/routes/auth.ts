import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logout, refresh, requestOtp, verifyFirebase, verifyOtp } from '../lib/auth.js';
import { Mobile, parse } from '../lib/http.js';

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
