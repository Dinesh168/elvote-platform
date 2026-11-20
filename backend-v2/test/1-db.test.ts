/** TC-B1, TC-B2, TC-B12: schema, sample data, least privilege and row-level security. */
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { pgUrl, superUrl } from '../src/config.js';
import { migrate } from '../scripts/migrate.js';

const su = (db: string) => new pg.Client({ connectionString: superUrl('t_' + db) });
const api = (db: string) => new pg.Client({ connectionString: pgUrl('t_' + db) });
const clients: pg.Client[] = [];
async function open(c: pg.Client) {
  await c.connect();
  clients.push(c);
  return c;
}
afterAll(async () => {
  for (const c of clients) await c.end();
});

const STATE_TABLES = ['districts', 'assembly_constituencies', 'elections', 'booths', 'roll_versions', 'voters', 'voter_sensitive', 'voter_contacts', 'contact_events',
  'applied_ops', 'poll_marks', 'booth_party_info', 'zones', 'zone_booths', 'drives', 'drive_scope', 'drive_assignees', 'import_jobs', 'import_staging',
  'stats_booth', 'stats_booth_daily', 'stats_dirty'];
const CORE_TABLES = ['shards', 'states', 'users', 'platform_admins', 'parties', 'party_constituencies', 'memberships', 'membership_booths', 'join_codes', 'sessions', 'otp_attempts', 'audit_log'];

describe('B1 databases and migrations', () => {
  it('TC-B1-1 every table exists in core and both state DBs, with AC partitions', async () => {
    const core = await open(su('elvote_core'));
    const t = (await core.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).rows.map((r) => r.tablename);
    for (const x of CORE_TABLES) expect(t).toContain(x);
    for (const db of ['elvote_pb', 'elvote_hr']) {
      const c = await open(su(db));
      const names = (await c.query(`SELECT relname FROM pg_class WHERE relkind IN ('r','p') AND relnamespace = 'public'::regnamespace`)).rows.map((r) => r.relname);
      for (const x of STATE_TABLES) expect(names).toContain(x);
    }
    const pb = await open(su('elvote_pb'));
    const parts = (await pb.query(`SELECT relname FROM pg_class WHERE relispartition AND relkind = 'r' AND relname LIKE 'voters_ac%' ORDER BY 1`)).rows.map((r) => r.relname);
    expect(parts).toEqual(['voters_ac50', 'voters_ac66']);
  });

  it('TC-B1-2 running migrations again changes nothing', async () => {
    const core = await open(su('elvote_core'));
    const before = (await core.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n;
    await migrate();
    const after = (await core.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n;
    expect(after).toBe(before);
  });

  it('voter ids carry the state number in the top bits', async () => {
    const pb = await open(su('elvote_pb'));
    const id = BigInt((await pb.query('SELECT min(id)::text AS id FROM voters')).rows[0].id);
    expect(id >> 40n).toBe(3n);
  });
});

describe('B2 sample data', () => {
  it('TC-B2-1 booth counts, voters per booth, logins', async () => {
    const pb = await open(su('elvote_pb'));
    const b = (await pb.query('SELECT ac_no, count(*)::int AS n FROM booths GROUP BY ac_no ORDER BY ac_no')).rows;
    expect(b).toEqual([{ ac_no: 50, n: 20 }, { ac_no: 66, n: 25 }]);
    const hr = await open(su('elvote_hr'));
    expect((await hr.query('SELECT count(*)::int AS n FROM booths')).rows[0].n).toBe(12);
    const sizes = (await pb.query('SELECT min(voters_count)::int AS lo, max(voters_count)::int AS hi FROM booths')).rows[0];
    expect(sizes.lo).toBeGreaterThanOrEqual(800);
    expect(sizes.hi).toBeLessThanOrEqual(1300);
    expect((await pb.query(`SELECT voters_count FROM booths WHERE ac_no = 66 AND part_no = 112`)).rows[0].voters_count).toBe(1200);
    const core = await open(su('elvote_core'));
    const users = (await core.query(`SELECT mobile FROM users WHERE mobile LIKE '900000000%' ORDER BY mobile`)).rows.map((r) => r.mobile);
    expect(users).toEqual(['9000000001', '9000000002', '9000000003', '9000000004', '9000000005']);
  });

  it('TC-B2-2 counters equal a raw recount for every booth', async () => {
    const pb = await open(su('elvote_pb'));
    const diff = await pb.query(`
      SELECT s.party_id, s.part_no FROM stats_booth s JOIN booths b ON b.id = s.booth_id
       WHERE s.total <> (SELECT count(*) FROM voters v WHERE v.booth_id = b.id AND v.ac_no = b.ac_no)
          OR s.met <> (SELECT count(*) FROM voter_contacts c WHERE c.party_id = s.party_id AND c.ac_no = b.ac_no AND c.part_no = b.part_no AND c.group_code IS NOT NULL)
          OR s.our <> (SELECT count(*) FROM voter_contacts c WHERE c.party_id = s.party_id AND c.ac_no = b.ac_no AND c.part_no = b.part_no AND c.group_code = 'our')`);
    expect(diff.rowCount).toBe(0);
    expect((await pb.query('SELECT count(*)::int AS n FROM stats_booth')).rows[0].n).toBe(70); // 25 + 20 + 25
  });
});

describe('B12 least privilege and row-level security', () => {
  it('TC-B12-1 API role sees no party rows without a party set, and only its own party with one', async () => {
    const c = await open(api('elvote_pb'));
    expect((await c.query('SELECT count(*)::int AS n FROM voter_contacts')).rows[0].n).toBe(0);
    const parties = (await (await open(su('elvote_pb'))).query('SELECT DISTINCT party_id FROM voter_contacts')).rows.map((r) => r.party_id);
    expect(parties.length).toBe(2);
    await c.query('BEGIN');
    await c.query(`SELECT set_config('app.party_id', $1, true)`, [parties[0]]);
    const seen = (await c.query('SELECT DISTINCT party_id FROM voter_contacts')).rows.map((r) => r.party_id);
    await c.query('COMMIT');
    expect(seen).toEqual([parties[0]]);
  });

  it('TC-B12-2 API role cannot truncate, read sensitive data, reach partitions directly or change the audit log', async () => {
    const c = await open(api('elvote_pb'));
    await expect(c.query('TRUNCATE voters')).rejects.toThrow(/permission denied/);
    await expect(c.query('SELECT * FROM voter_sensitive LIMIT 1')).rejects.toThrow(/permission denied/);
    await expect(c.query('SELECT * FROM voter_contacts_ac66 LIMIT 1')).rejects.toThrow(/permission denied/);
    await expect(c.query('DROP TABLE booths')).rejects.toThrow(/must be owner|permission denied/);
    const core = await open(api('elvote_core'));
    await expect(core.query('DELETE FROM audit_log')).rejects.toThrow(/permission denied/);
  });
});
