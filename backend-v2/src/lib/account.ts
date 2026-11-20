/**
 * Account deletion (spec docs/specs/account-deletion.md).
 * Request → locked at once, erased after 7 days; signing in before then cancels (see auth.signIn).
 * Erasure removes the person (name, mobile, EPIC, sessions, memberships) and keeps the party's voter work.
 */
import { allStateCodes, core, inParty, statePool } from '../db/pools.js';
import { audit } from './access.js';
import { checkFreshFirebase, checkOtpCode, requestOtp } from './auth.js';
import { ApiError, badRequest, conflict, invalid, notFound } from './errors.js';

export const DELETION_DAYS = 7;

async function mobileOf(userId: string): Promise<string> {
  const r = await core.query<{ mobile: string | null }>('SELECT mobile FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  const m = r.rows[0]?.mobile;
  if (!m) throw notFound();
  return m;
}

/** AD1: sends a code to the account's own mobile (never a mobile from the request). */
export async function sendDeletionCode(userId: string) {
  return requestOtp(await mobileOf(userId));
}

/** ACs where this user is the only approved admin (ADD3). */
export async function soleAdminAcs(userId: string) {
  const r = await core.query<{ state_code: string; ac_no: number; ac_name: string; party_name: string }>(
    `SELECT trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, p.name AS party_name
       FROM memberships m
       JOIN party_constituencies pc ON pc.id = m.party_constituency_id AND pc.deleted_at IS NULL
       JOIN parties p ON p.id = pc.party_id
      WHERE m.user_id = $1 AND m.role = 'admin' AND m.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM memberships o JOIN users ou ON ou.id = o.user_id
           WHERE o.party_constituency_id = m.party_constituency_id AND o.role = 'admin' AND o.status = 'approved'
             AND o.user_id <> m.user_id AND ou.deleted_at IS NULL AND ou.deletion_requested_at IS NULL)
      ORDER BY pc.state_code, pc.ac_no`,
    [userId],
  );
  return r.rows.map((x) => ({ stateCode: x.state_code, acNo: x.ac_no, acName: x.ac_name, partyName: x.party_name }));
}

/** AD2: confirm word + fresh code (or Firebase token) + not the last admin → locked now, erased in 7 days. */
export async function requestDeletion(userId: string, b: { confirm: string; code?: string; idToken?: string }) {
  if (b.confirm !== 'DELETE') throw badRequest('confirm_required', 'Type DELETE to confirm.');
  // A wrong code is a 422 here, not 401: the user is signed in, and 401 would make the app sign them out.
  try {
    if (b.idToken) {
      // AC13: a fresh Google / email sign-in of this same account.
      await checkFreshFirebase(userId, b.idToken);
    } else if (b.code) {
      await checkOtpCode(await mobileOf(userId), b.code);
    } else {
      throw invalid('otp_invalid', 'Wrong code. Try again.');
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw invalid(e.code, 'Wrong code. Try again.');
    throw e;
  }
  const sole = await soleAdminAcs(userId);
  if (sole.length) throw conflict('last_admin', 'Make another team member admin first, or ask the super-admin.', { acs: sole });

  const r = await core.query<{ due: Date }>(
    `UPDATE users SET deletion_requested_at = now(), deletion_due_at = now() + make_interval(days => $2), updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL RETURNING deletion_due_at AS due`,
    [userId, DELETION_DAYS],
  );
  await core.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  await audit({ actor: userId, role: 'self', action: 'account.delete_requested', entity: 'user', entityId: userId });
  return { ok: true, dueAt: r.rows[0].due.toISOString() };
}

/** AD4: erases every account whose 7 days have passed. Safe to run often and from several processes. */
export async function eraseDueAccounts(limit = 50): Promise<number> {
  const due = await core.query<{ id: string }>(
    `SELECT id FROM users WHERE deletion_due_at <= now() AND deleted_at IS NULL ORDER BY deletion_due_at LIMIT $1`,
    [limit],
  );
  let n = 0;
  for (const { id } of due.rows) {
    const c = await core.connect();
    try {
      await c.query('BEGIN');
      // Lock the row; skip if another worker has it or the user cancelled meanwhile.
      const lock = await c.query('SELECT 1 FROM users WHERE id = $1 AND deletion_due_at <= now() AND deleted_at IS NULL FOR UPDATE SKIP LOCKED', [id]);
      if (!lock.rowCount) { await c.query('ROLLBACK'); continue; }
      const mob = await c.query<{ mobile: string | null }>('SELECT mobile FROM users WHERE id = $1', [id]);
      await c.query(`DELETE FROM membership_booths WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1)`, [id]);
      // polling-day location data (spec polling-day O1)
      await c.query(`DELETE FROM field_presence WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1)`, [id]);
      await c.query(`DELETE FROM presence_events WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1)`, [id]);
      await c.query('DELETE FROM push_tokens WHERE user_id = $1', [id]);
      await c.query(`UPDATE memberships SET status = 'removed', updated_at = now() WHERE user_id = $1 AND status <> 'removed'`, [id]);
      await c.query(`UPDATE platform_admins SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [id]);
      await c.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      if (mob.rows[0]?.mobile) await c.query('DELETE FROM otp_attempts WHERE mobile = $1', [mob.rows[0].mobile]);
      await c.query(
        `UPDATE users SET mobile = NULL, email = NULL, firebase_uid = NULL, epic = NULL, name = '', status = 'deleted',
                deleted_at = now(), deletion_due_at = NULL, updated_at = now() WHERE id = $1`,
        [id],
      );
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
    // Drive assignments live in the state DBs (no personal data, but they would keep the person on task lists).
    for (const code of await allStateCodes()) {
      await inParty(await statePool(code), 'ALL', (c2) => c2.query('DELETE FROM drive_assignees WHERE user_id = $1', [id]));
    }
    await audit({ actor: id, role: 'system', action: 'account.erased', entity: 'user', entityId: id });
    n++;
  }
  return n;
}
