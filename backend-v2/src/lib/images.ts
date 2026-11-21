/**
 * Image uploads (logo, candidate photo, team banner): PNG / JPG / WebP checked by their bytes, saved under a random
 * name and served publicly at /files/<name> (spec customer-cms, onboarding-branding OB8).
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FastifyRequest } from 'fastify';
import { invalid } from './errors.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export function imageType(buf: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/** Reads the uploaded file of a multipart request, checks it, saves it; returns its public url. */
export async function saveImage(req: FastifyRequest, maxBytes: number): Promise<string> {
  const mb = `${Math.round(maxBytes / 1024 / 1024)} MB`;
  const file = await req.file({ limits: { fileSize: maxBytes } });
  if (!file) throw invalid('file_missing', 'Choose an image.');
  const buf = await file.toBuffer().catch(() => { throw invalid('file_too_big', `The image must be ${mb} or smaller.`); });
  if (file.file.truncated) throw invalid('file_too_big', `The image must be ${mb} or smaller.`);
  const ext = imageType(buf);
  if (!ext) throw invalid('not_image', 'Use a PNG, JPG or WebP image.');
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/files/${name}`;
}
