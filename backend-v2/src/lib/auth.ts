/**
 * Auth: OTP (dev mode) or Firebase ID token → our own short-lived JWT access token + rotating refresh token.
 */
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { env } from '../config.js';
import { core } from '../db/pools.js';
import { audit } from './access.js';
import { ApiError, invalid, tooMany, unauthorized } from './errors.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);
export const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_DAYS = 30;
const DEV_OTP = '123456';
const MAX_REQUESTS = 5; // per 10 min per mobile
const MAX_FAILURES = 5;
const LOCK_MIN = 10;

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function signAccess(userId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime(`${ACCESS_TTL_S}s`).setIssuer('elvote').sign(secret);
}

export async function verifyAccess(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'elvote', algorithms: ['HS256'] });
    if (!payload.sub) throw new Error('no sub');
    return payload.sub;
  } catch {
    throw unauthorized('token_invalid');
  }
}

async function issue(userId: string, device?: string) {
  const refresh = randomBytes(32).toString('base64url');
  await core.query(
    `INSERT INTO sessions (user_id, device, refresh_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [userId, device ?? null, sha256(refresh), REFRESH_TTL_DAYS],
  );
  return { accessToken: await signAccess(userId), refreshToken: refresh, expiresIn: ACCESS_TTL_S };
}

export async function requestOtp(mobile: string) {
  const r = await core.query<{ requests: number; locked_until: Date | null }>(
    `INSERT INTO otp_attempts (mobile, requests, window_start) VALUES ($1, 1, now())
     ON CONFLICT (mobile) DO UPDATE SET
       requests = CASE WHEN otp_attempts.window_start < now() - interval '10 minutes' THEN 1 ELSE otp_attempts.requests + 1 END,
       window_start = CASE WHEN otp_attempts.window_start < now() - interval '10 minutes' THEN now() ELSE otp_attempts.window_start END
     RETURNING requests, locked_until`,
    [mobile],
  );
  const row = r.rows[0];
  if (row.locked_until && row.locked_until > new Date()) throw tooMany('otp_locked', 'Too many wrong codes. Try again in 10 minutes.');
  if (row.requests > MAX_REQUESTS) throw tooMany('otp_rate', 'Too many requests. Try again in 10 minutes.');
  // AUTH_MODE=dev: no SMS is sent; the code is always 123456.
  return { sent: true, devCode: env.AUTH_MODE === 'dev' ? DEV_OTP : undefined };
}

export async function verifyOtp(mobile: string, code: string, device?: string) {
  await checkOtpCode(mobile, code);
  return signIn(mobile, device);
}

/** Checks a 6-digit code for a mobile with failure counting and lock-out (sign-in and account deletion). */
export async function checkOtpCode(mobile: string, code: string) {
  if (env.AUTH_MODE !== 'dev') throw invalid('otp_mode', 'Use Firebase sign-in in this environment.');
  const a = await core.query<{ failures: number; locked_until: Date | null }>('SELECT failures, locked_until FROM otp_attempts WHERE mobile = $1', [mobile]);
  const st = a.rows[0];
  if (st?.locked_until && st.locked_until > new Date()) throw tooMany('otp_locked', 'Too many wrong codes. Try again in 10 minutes.');
  if (code !== DEV_OTP) {
    await core.query(
      `INSERT INTO otp_attempts (mobile, failures) VALUES ($1, 1)
       ON CONFLICT (mobile) DO UPDATE SET failures = otp_attempts.failures + 1,
         locked_until = CASE WHEN otp_attempts.failures + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE NULL END`,
      [mobile, MAX_FAILURES, LOCK_MIN],
    );
    const after = await core.query<{ locked_until: Date | null }>('SELECT locked_until FROM otp_attempts WHERE mobile = $1', [mobile]);
    if (after.rows[0]?.locked_until) throw tooMany('otp_locked', 'Too many wrong codes. Try again in 10 minutes.');
    throw unauthorized('otp_invalid');
  }
  await core.query('UPDATE otp_attempts SET failures = 0, locked_until = NULL WHERE mobile = $1', [mobile]);
}

/** Finds or creates the user for a verified mobile. New users get a placeholder name until they join. */
async function signIn(mobile: string, device?: string, firebaseUid?: string) {
  const u = await core.query<{ id: string; status: string }>(
    `INSERT INTO users (mobile, name, firebase_uid) VALUES ($1, '', $2)
     ON CONFLICT (mobile) DO UPDATE SET firebase_uid = COALESCE(users.firebase_uid, EXCLUDED.firebase_uid), updated_at = now()
     RETURNING id, status`,
    [mobile, firebaseUid ?? null],
  );
  if (u.rows[0].status !== 'active') throw new ApiError(401, 'user_blocked', 'Your access is paused. Contact your provider.');
  // Account deletion undo (AD3): signing in within the 7 days cancels the request.
  const undo = await core.query(
    `UPDATE users SET deletion_requested_at = NULL, deletion_due_at = NULL, updated_at = now()
      WHERE id = $1 AND deletion_requested_at IS NOT NULL AND deleted_at IS NULL RETURNING id`,
    [u.rows[0].id],
  );
  if (undo.rowCount) {
    await audit({ actor: u.rows[0].id, role: 'self', action: 'account.delete_cancelled', entity: 'user', entityId: u.rows[0].id });
  }
  return { ...(await issue(u.rows[0].id, device)), ...(undo.rowCount ? { deletionCancelled: true } : {}) };
}

const firebaseJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

/** Production sign-in: the app verifies the phone with Firebase and sends the ID token here. */
export async function verifyFirebase(idToken: string, device?: string) {
  const { phone, uid } = await firebasePhone(idToken);
  return signIn(phone, device, uid);
}

/** Verifies a Firebase ID token and returns its 10-digit Indian mobile. */
export async function firebasePhone(idToken: string): Promise<{ phone: string; uid: string }> {
  if (env.AUTH_MODE !== 'firebase' || !env.FIREBASE_PROJECT_ID) throw invalid('firebase_off', 'Firebase sign-in is not enabled.');
  const pid = env.FIREBASE_PROJECT_ID;
  const { payload } = await jwtVerify(idToken, firebaseJwks, { issuer: `https://securetoken.google.com/${pid}`, audience: pid }).catch(() => {
    throw unauthorized('firebase_invalid');
  });
  const phone = String((payload as { phone_number?: string }).phone_number ?? '').replace(/^\+91/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) throw unauthorized('firebase_no_phone');
  return { phone, uid: String(payload.sub) };
}

export async function refresh(token: string) {
  const r = await core.query<{ id: string; user_id: string }>(
    `UPDATE sessions SET revoked_at = now() WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING id, user_id`,
    [sha256(token)],
  );
  if (!r.rowCount) throw unauthorized('refresh_invalid');
  const u = await core.query<{ status: string }>('SELECT status FROM users WHERE id = $1', [r.rows[0].user_id]);
  if (u.rows[0]?.status !== 'active') throw unauthorized('user_blocked');
  return issue(r.rows[0].user_id);
}

export async function logout(token: string) {
  await core.query('UPDATE sessions SET revoked_at = now() WHERE refresh_hash = $1 AND revoked_at IS NULL', [sha256(token)]);
}
