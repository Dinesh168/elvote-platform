/**
 * C9 vote trace: who changed a voter, when, and what. Reads contact_events (append-only).
 * Mobile numbers are never in history (the change only says "mobile: true").
 */
import { core, inParty, statePool } from '../db/pools.js';
import { notFound } from './errors.js';

export type TraceFind = { epic: string } | { booth: number; sno: number };

export async function traceVoter(stateCode: string, acNo: number, find: TraceFind, partyId: string | 'ALL') {
  const pool = await statePool(stateCode);
  return inParty(pool, partyId, async (c) => {
    const params: unknown[] = [acNo];
    let where: string;
    if ('epic' in find) { params.push(find.epic.toUpperCase()); where = 'upper(v.epic) = $2'; }
    else { params.push(find.booth, find.sno); where = 'v.part_no = $2 AND v.sno = $3'; }
    const v = await c.query<{ id: string; name: string; epic: string; part_no: number; sno: number; house_no: string | null; age: number | null; relative_name: string | null }>(
      `SELECT v.id::text, v.name, v.epic, v.part_no, v.sno, v.house_no, v.age, v.relative_name FROM voters v WHERE v.ac_no = $1 AND ${where} ORDER BY (v.status IN ('active','added')) DESC LIMIT 1`, params);
    if (!v.rowCount) throw notFound('voter_not_found');
    const voter = v.rows[0];
    const ev = await c.query<{ at: Date; party_id: string; user_id: string; change: Record<string, unknown>; source: string; part_no: number }>(
      `SELECT at, party_id, user_id, change, source, part_no FROM contact_events WHERE ac_no = $1 AND voter_id = $2 ORDER BY at DESC, id DESC LIMIT 200`,
      [acNo, voter.id]);
    const users = [...new Set(ev.rows.map((e) => e.user_id))];
    const parties = [...new Set(ev.rows.map((e) => e.party_id))];
    const [un, pn] = await Promise.all([
      users.length ? core.query<{ id: string; name: string }>('SELECT id, name FROM users WHERE id = ANY($1::uuid[])', [users]) : { rows: [] },
      parties.length ? core.query<{ id: string; name: string }>('SELECT id, name FROM parties WHERE id = ANY($1::uuid[])', [parties]) : { rows: [] },
    ]);
    const uName = new Map(un.rows.map((x) => [x.id, x.name]));
    const pName = new Map(pn.rows.map((x) => [x.id, x.name]));
    return {
      voter: { id: voter.id, name: voter.name, epic: voter.epic, booth: voter.part_no, sno: voter.sno, house: voter.house_no, age: voter.age, relative: voter.relative_name },
      events: ev.rows.map((e) => ({ at: e.at.toISOString(), by: uName.get(e.user_id) ?? '', party: pName.get(e.party_id) ?? '', change: e.change, source: e.source, booth: e.part_no })),
    };
  });
}
