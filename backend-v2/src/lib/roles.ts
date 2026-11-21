/**
 * One account = one role (spec usability-r2 R1, decision D1): admin or volunteer, never both.
 * Pending counts too, so a person cannot ask for both at the same time. The super-admin is separate.
 */
import { core } from '../db/pools.js';
import { ApiError } from './errors.js';

type Role = 'admin' | 'volunteer';

/** The team (party · AC) where the user already holds or asked for the other role, or null. */
export async function otherRole(userId: string, want: Role): Promise<{ role: Role; team: string; pending: boolean } | null> {
  const other: Role = want === 'admin' ? 'volunteer' : 'admin';
  const m = await core.query<{ party_name: string; ac_no: number; ac_name: string; status: string }>(
    `SELECT p.name AS party_name, pc.ac_no, pc.ac_name, ms.status
       FROM memberships ms JOIN party_constituencies pc ON pc.id = ms.party_constituency_id AND pc.deleted_at IS NULL
       JOIN parties p ON p.id = pc.party_id
      WHERE ms.user_id = $1 AND ms.role = $2 AND ms.status IN ('approved','pending')
      ORDER BY (ms.status = 'approved') DESC LIMIT 1`, [userId, other]);
  if (m.rows[0]) {
    const r = m.rows[0];
    return { role: other, team: `${r.party_name} · AC ${r.ac_no} ${r.ac_name}`, pending: r.status === 'pending' };
  }
  if (want === 'volunteer') {
    const a = await core.query<{ party_name: string }>(`SELECT party_name FROM access_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`, [userId]);
    if (a.rows[0]) return { role: 'admin', team: a.rows[0].party_name, pending: true };
  }
  return null;
}

/** Throws 409 role_conflict when the user already is (or asked to be) the other role. */
export async function assertOneRole(userId: string, want: Role) {
  const o = await otherRole(userId, want);
  if (!o) return;
  const msg = o.role === 'volunteer'
    ? `This account is ${o.pending ? 'waiting to join' : 'a volunteer of'} ${o.team}. One account can be a volunteer or an admin, not both. Leave that team first, or use another account.`
    : `This account is ${o.pending ? 'waiting for admin access to' : 'an admin of'} ${o.team}. One account can be a volunteer or an admin, not both. Use another account to join as a volunteer.`;
  throw new ApiError(409, 'role_conflict', msg);
}
