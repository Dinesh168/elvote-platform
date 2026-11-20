import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

export let app: FastifyInstance;
export async function start() {
  app = await buildApp();
  return app;
}

export async function login(mobile: string) {
  const r = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { mobile, code: '123456' } });
  if (r.statusCode !== 200) throw new Error(`login ${mobile}: ${r.body}`);
  const { accessToken, refreshToken } = r.json();
  return { token: accessToken as string, refreshToken: refreshToken as string };
}

export function call(token: string) {
  const req = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: unknown) =>
    app.inject({ method, url, payload: payload as never, headers: { authorization: `Bearer ${token}` } });
  return {
    get: (url: string) => req('GET', url),
    post: (url: string, body?: unknown) => req('POST', url, body ?? {}),
    put: (url: string, body?: unknown) => req('PUT', url, body ?? {}),
    patch: (url: string, body?: unknown) => req('PATCH', url, body ?? {}),
    del: (url: string) => req('DELETE', url),
  };
}

export async function membership(token: string, pred: (m: { role: string; acNo: number; stateCode: string; partyName: string }) => boolean) {
  const me = (await call(token).get('/v1/me')).json();
  const m = me.memberships.find(pred);
  if (!m) throw new Error('membership not found');
  return m.id as string;
}
