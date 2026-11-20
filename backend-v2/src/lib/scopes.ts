/**
 * Admin access scopes (spec accounts-access AC7, AC8): assemblies (direct memberships) or a whole state
 * (admin_scopes + memberships with source = 'state', also for customers created later).
 * Access checks stay membership-based, so every existing admin route works unchanged.
 */
import { core, inParty, statePool } from '../db/pools.js';
import { audit, checkLimit } from './access.js';
import { ApiError, invalid } from './errors.js';
import { notify } from './notify.js';

/** Creates a customer (party × assembly) with default settings; the assembly must exist in the state DB. */
export async function createCustomer(actor: string, partyId: string, stateCode: string, acNo: number, maxZones = 10): Promise<string> {
  const pool = await statePool(stateCode);
  const ac = await pool.query<{ name: string }>('SELECT name FROM assembly_constituencies WHERE ac_no = $1', [acNo]);
  if (!ac.rowCount) throw invalid('ac_unknown', 'Upload this AC’s voter roll first.');
  const zoneCount = Math.min(10, maxZones);
  const r = await core.query<{ id: string }>(
    `INSERT INTO party_constituencies (party_id, state_code, ac_no, ac_name, max_zones, zone_count) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [partyId, stateCode, acNo, ac.rows[0].name, maxZones, zoneCount]).catch((e: { code?: string }) => {
    if (e.code === '23505') throw invalid('exists', 'This party already works in this AC.');
    throw e;
  });
  await inParty(pool, partyId, async (c) => {
    for (let n = 1; n <= zoneCount; n++) await c.query('INSERT INTO zones (party_id, ac_no, number, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [partyId, acNo, n, `Z${n}`]);
    await c.query('INSERT INTO stats_dirty (party_id, booth_id) SELECT $1, id FROM booths WHERE ac_no = $2 ON CONFLICT DO NOTHING', [partyId, acNo]);
  });
  await audit({ actor, role: 'super_admin', action: 'partyac.create', partyId, stateCode, acNo, entity: 'party_ac', entityId: r.rows[0].id });
  await addStateAdminsTo(r.rows[0].id);
  return r.rows[0].id;
}

/** AC8: whole-state admins of this party/state get the new customer automatically. */
export async function addStateAdminsTo(partyAcId: string) {
  await core.query(
    `INSERT INTO memberships (user_id, party_constituency_id, role, status, source, decided_by, decided_at)
     SELECT s.user_id, pc.id, 'admin', 'approved', 'state', s.granted_by, now()
       FROM party_constituencies pc JOIN admin_scopes s ON s.party_id = pc.party_id AND s.state_code = pc.state_code AND s.revoked_at IS NULL
      WHERE pc.id = $1
     ON CONFLICT (user_id, party_constituency_id) DO UPDATE
       SET role = 'admin', status = 'approved', updated_at = now(),
           source = CASE WHEN memberships.role = 'admin' AND memberships.status = 'approved' THEN memberships.source ELSE 'state' END`,
    [partyAcId]);
}

/** Whole state: scope row + memberships for every current customer of the party in the state. */
export async function grantState(actor: string, userId: string, partyId: string, stateCode: string) {
  await core.query(
    `INSERT INTO admin_scopes (user_id, party_id, state_code, granted_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [userId, partyId, stateCode, actor]);
  await core.query(
    `INSERT INTO memberships (user_id, party_constituency_id, role, status, source, decided_by, decided_at)
     SELECT $1, pc.id, 'admin', 'approved', 'state', $4, now()
       FROM party_constituencies pc WHERE pc.party_id = $2 AND pc.state_code = $3 AND pc.deleted_at IS NULL
     ON CONFLICT (user_id, party_constituency_id) DO UPDATE
       SET role = 'admin', status = 'approved', decided_by = $4, decided_at = now(), updated_at = now(),
           source = CASE WHEN memberships.role = 'admin' AND memberships.status = 'approved' THEN memberships.source ELSE 'state' END`,
    [userId, partyId, stateCode, actor]);
  await audit({ actor, role: 'super_admin', action: 'access.grant_state', partyId, stateCode, entity: 'user', entityId: userId });
}

/** Assemblies: direct admin memberships. Missing customers → 422 no_customer unless createMissing. */
export async function grantAssemblies(actor: string, userId: string, partyId: string, stateCode: string, acNos: number[], createMissing = false) {
  const want = [...new Set(acNos)];
  const have = await core.query<{ id: string; ac_no: number }>(
    `SELECT id, ac_no FROM party_constituencies WHERE party_id = $1 AND state_code = $2 AND ac_no = ANY($3::smallint[]) AND deleted_at IS NULL`,
    [partyId, stateCode, want]);
  const byAc = new Map(have.rows.map((r) => [r.ac_no, r.id]));
  const missing = want.filter((a) => !byAc.has(a));
  if (missing.length && !createMissing) {
    throw new ApiError(422, 'no_customer', 'These assemblies have no customer settings for this party yet.', { acNos: missing });
  }
  for (const ac of missing) byAc.set(ac, await createCustomer(actor, partyId, stateCode, ac));
  for (const ac of want) {
    const pcId = byAc.get(ac)!;
    const cur = await core.query<{ id: string; role: string; status: string; source: string }>(
      'SELECT id, role, status, source FROM memberships WHERE user_id = $1 AND party_constituency_id = $2', [userId, pcId]);
    const c = cur.rows[0];
    if (c?.role === 'admin' && c.status === 'approved' && c.source === 'direct') continue;
    await checkLimit(pcId, 'admin', c?.id);
    await core.query(
      `INSERT INTO memberships (user_id, party_constituency_id, role, status, source, decided_by, decided_at) VALUES ($1,$2,'admin','approved','direct',$3, now())
       ON CONFLICT (user_id, party_constituency_id) DO UPDATE
         SET role = 'admin', status = 'approved', source = 'direct', decided_by = $3, decided_at = now(), reject_reason = NULL, updated_at = now()`,
      [userId, pcId, actor]);
    await core.query('DELETE FROM membership_booths WHERE membership_id = (SELECT id FROM memberships WHERE user_id = $1 AND party_constituency_id = $2)', [userId, pcId]);
  }
  await audit({ actor, role: 'super_admin', action: 'access.grant_acs', partyId, stateCode, entity: 'user', entityId: userId, details: { acNos: want, created: missing.length && createMissing ? missing : [] } });
}

/** Removes a whole-state scope; its memberships are removed, direct ones stay. */
export async function revokeState(actor: string, userId: string, partyId: string, stateCode: string) {
  const r = await core.query(
    `UPDATE admin_scopes SET revoked_at = now() WHERE user_id = $1 AND party_id = $2 AND state_code = $3 AND revoked_at IS NULL RETURNING id`,
    [userId, partyId, stateCode]);
  if (!r.rowCount) return false;
  await core.query(
    `UPDATE memberships m SET status = 'removed', updated_at = now()
       FROM party_constituencies pc
      WHERE pc.id = m.party_constituency_id AND m.user_id = $1 AND pc.party_id = $2 AND pc.state_code = $3
        AND m.source = 'state' AND m.status = 'approved'`, [userId, partyId, stateCode]);
  await audit({ actor, role: 'super_admin', action: 'access.revoke_state', partyId, stateCode, entity: 'user', entityId: userId });
  const p = await core.query<{ name: string }>('SELECT name FROM parties WHERE id = $1', [partyId]);
  await notify([userId], 'removed', { party: p.rows[0]?.name ?? '', area: stateCode });
  return true;
}

/** Current admin access of a user: whole-state scopes + direct assemblies. */
export async function adminAccessOf(userId: string) {
  const states = await core.query<{ party_id: string; party_name: string; state_code: string; created_at: Date }>(
    `SELECT s.party_id, p.name AS party_name, trim(s.state_code) AS state_code, s.created_at
       FROM admin_scopes s JOIN parties p ON p.id = s.party_id WHERE s.user_id = $1 AND s.revoked_at IS NULL ORDER BY p.name, s.state_code`, [userId]);
  const acs = await core.query<{ membership_id: string; party_id: string; party_name: string; state_code: string; ac_no: number; ac_name: string; source: string }>(
    `SELECT m.id AS membership_id, pc.party_id, p.name AS party_name, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, m.source
       FROM memberships m JOIN party_constituencies pc ON pc.id = m.party_constituency_id JOIN parties p ON p.id = pc.party_id
      WHERE m.user_id = $1 AND m.role = 'admin' AND m.status = 'approved' ORDER BY p.name, pc.state_code, pc.ac_no`, [userId]);
  return {
    states: states.rows.map((s) => ({ partyId: s.party_id, partyName: s.party_name, stateCode: s.state_code, since: s.created_at })),
    assemblies: acs.rows.map((a) => ({ membershipId: a.membership_id, partyId: a.party_id, partyName: a.party_name, stateCode: a.state_code, acNo: a.ac_no, acName: a.ac_name, source: a.source })),
  };
}
