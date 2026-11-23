import 'dotenv/config';
import { z } from 'zod';

export const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  /** 127.0.0.1 behind nginx on a server (spec live-demo D6), so the API port is not reachable from outside. */
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  PG_HOST: z.string().default('127.0.0.1'),
  PG_PORT: z.coerce.number().default(5544),
  PG_SUPERUSER: z.string().default('postgres'),
  PG_SUPERPASS: z.string().default('local-dev-only'),
  PG_API_USER: z.string().default('elvote_api'),
  PG_API_PASS: z.string().default('local-api-only'),
  CORE_DB: z.string().default('elvote_core'),
  AUTH_MODE: z.enum(['dev', 'firebase']).default('dev'),
  JWT_SECRET: z.string().min(32),
  FIREBASE_PROJECT_ID: z.string().optional(),
  /** Web Push (spec accounts-access AC11). Generate once: npx web-push generate-vapid-keys. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:support@champn.in'),
  /** spec states-keyboard O1: states used in this environment (comma list, e.g. PB,UP). Empty = all built-in states. */
  STATES: z.string().default(''),
});

export const env = Env.parse(process.env);

if (env.NODE_ENV === 'production' && env.AUTH_MODE === 'dev') {
  throw new Error('AUTH_MODE=dev is not allowed in production');
}

/** States configured in this environment. In production these rows live in core.states / core.shards. */
export const ALL_STATES = [
  { code: 'PB', stateNo: 3, name: 'Punjab', nameLocal: 'ਪੰਜਾਬ', lang: 'pa', db: 'elvote_pb', hostRef: 'STATE_DB_PB' },
  { code: 'HR', stateNo: 6, name: 'Haryana', nameLocal: 'हरियाणा', lang: 'hi', db: 'elvote_hr', hostRef: 'STATE_DB_HR' },
  { code: 'UP', stateNo: 9, name: 'Uttar Pradesh', nameLocal: 'उत्तर प्रदेश', lang: 'hi', db: 'elvote_up', hostRef: 'STATE_DB_UP' },
] as const;

/** spec states-keyboard O1: the built-in states named in `list` (unknown codes ignored); empty = all. */
export const statesFor = (list: string) => {
  const want = list.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  return want.length ? ALL_STATES.filter((s) => want.includes(s.code)) : [...ALL_STATES];
};
export const LOCAL_STATES = statesFor(env.STATES);

export const pgUrl = (db: string, user = env.PG_API_USER, pass = env.PG_API_PASS) =>
  `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${env.PG_HOST}:${env.PG_PORT}/${db}`;
export const superUrl = (db: string) => pgUrl(db, env.PG_SUPERUSER, env.PG_SUPERPASS);
