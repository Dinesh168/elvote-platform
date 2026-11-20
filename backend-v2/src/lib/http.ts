import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { invalid } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

/** Validates input; any mismatch → 422 with the first problem. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    throw invalid('validation', `${i.path.join('.') || 'input'}: ${i.message}`);
  }
  return r.data;
}

export const Mobile = z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number');
export const Uuid = z.string().uuid();
export const PartNo = z.coerce.number().int().min(1).max(9999);
export const VoterId = z.string().regex(/^\d{1,19}$/);
export const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type Req = FastifyRequest;
export type Rep = FastifyReply;
