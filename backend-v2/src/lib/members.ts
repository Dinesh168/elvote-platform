/**
 * Volunteer approval, shared by the admin Team page and the super-admin (spec accounts-access AC10).
 */
import { core, statePool } from '../db/pools.js';
import { audit, checkLimit } from './access.js';
import { invalid, notFound } from './errors.js';
import { areaOf, notify } from './notify.js';

interface Customer { partyAcId: string; partyId: string; stateCode: string; acNo: number }
type Actor = { userId: string; role: 'admin' | 'super_admin' };

export async function customerById(partyAcId: string): Promise<Customer> {
  const r = await core.query<{ party_id: string; state_code: string; ac_no: number }>(
    'SELECT party_id, trim(state_code) AS state_code, ac_no FROM party_constituencies WHERE id = $1 AND deleted_at IS NULL', [partyAcId]);
  if (!r.rowCount) throw notFound();
  return { partyAcId, partyId: r.rows[0].party_id, stateCode: r.rows[0].state_code, acNo: r.rows[0].ac_no };
}

export async function approveVolunteer(c: Customer, membershipId: string, booths: number[], by: Actor) {
  const pool = await statePool(c.stateCode);
  const valid = await pool.query('SELECT part_no FROM booths WHERE ac_no = $1 AND part_no = ANY($2::smallint[])', [c.acNo, booths]);
  if (valid.rowCount !== new Set(booths).size) throw invalid('booth_invalid', 'Pick booths from the list.');
  await checkLimit(c.partyAcId, 'volunteer', membershipId);
  const r = await core.query<{ user_id: string }>(
    `UPDATE memberships SET status = 'approved', decided_by = $3, decided_at = now(), reject_reason = NULL, updated_at = now()
      WHERE id = $1 AND party_constituency_id = $2 AND role = 'volunteer' RETURNING user_id`, [membershipId, c.partyAcId, by.userId]);
  if (!r.rowCount) throw notFound();
  await core.query('DELETE FROM membership_booths WHERE membership_id = $1', [membershipId]);
  for (const no of new Set(booths)) await core.query('INSERT INTO membership_booths (membership_id, part_no, approved_by) VALUES ($1,$2,$3)', [membershipId, no, by.userId]);
  await audit({ actor: by.userId, role: by.role, action: 'member.approve', partyId: c.partyId, stateCode: c.stateCode, acNo: c.acNo, entity: 'membership', entityId: membershipId, details: { booths: [...new Set(booths)] } });
  await notify([r.rows[0].user_id], 'approved', await areaOf(c.partyAcId));
}

export async function rejectVolunteer(c: Customer, membershipId: string, reason: string, by: Actor) {
  const r = await core.query<{ user_id: string }>(
    `UPDATE memberships SET status = 'rejected', reject_reason = $3, decided_by = $4, decided_at = now(), updated_at = now()
      WHERE id = $1 AND party_constituency_id = $2 AND role = 'volunteer' RETURNING user_id`, [membershipId, c.partyAcId, reason, by.userId]);
  if (!r.rowCount) throw notFound();
  await audit({ actor: by.userId, role: by.role, action: 'member.reject', partyId: c.partyId, stateCode: c.stateCode, acNo: c.acNo, entity: 'membership', entityId: membershipId });
  await notify([r.rows[0].user_id], 'rejected', { reason });
}
