/**
 * Super-admin CMS (spec docs/specs/customer-cms.md): customer settings, uploads, users, vote trace.
 * Registered inside platformRoutes, so the super-admin check already ran for /v1/admin/*.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { core, statePool } from '../db/pools.js';
import { audit, checkLimit, FEATURE_KEYS, featuresOf, forgetUserStatus } from '../lib/access.js';
import { ApiError, invalid, notFound } from '../lib/errors.js';
import { Mobile, parse, PartNo, Uuid } from '../lib/http.js';
import { areaOf, notify } from '../lib/notify.js';
import { saveImage } from '../lib/images.js';
import { traceVoter } from '../lib/trace.js';

export { UPLOAD_DIR } from '../lib/images.js';

const Colour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a colour like #1B5E20');
const Lang = z.enum(['en', 'hi', 'pa']); // languages the app ships (spec bilingual-roll L4)
const text = (max: number) => z.string().trim().max(max);
const Features = z.object(Object.fromEntries(FEATURE_KEYS.map((k) => [k, z.boolean()])) as Record<(typeof FEATURE_KEYS)[number], z.ZodBoolean>).partial().strict();

const Settings = z.object({
  appName: text(30).nullable(), colour: Colour.nullable(),
  candidateName: text(80).nullable(), ballotNo: z.number().int().min(1).max(99).nullable(), slogan: text(80).nullable(),
  message: text(300).nullable(), slipShareText: text(300).nullable(),
  features: Features, defaultLang: Lang.nullable(), languages: z.array(Lang).min(1).max(3),
  maxZones: z.number().int().min(1).max(50), maxVolunteers: z.number().int().min(0).max(100_000).nullable(), maxAdmins: z.number().int().min(1).max(100).nullable(),
  status: z.enum(['active', 'paused', 'closed']), validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  syncMode: z.enum(['live', 'offline', 'scheduled']), syncMinutes: z.number().int().min(1, 'At least 1 minute').max(120, 'At most 120 minutes'),
  boothRadiusM: z.number().int().min(50, 'At least 50 m').max(2000, 'At most 2,000 m'),
}).partial().strict();

const COLS = `pc.id, p.name AS party_name, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, pc.app_name, pc.logo_url, pc.banner_url, pc.brand_colour,
  pc.candidate_name, pc.candidate_photo_url, pc.ballot_no, pc.candidate_slogan, pc.candidate_message, pc.slip_share_text, pc.features,
  pc.regional_lang, pc.languages, pc.max_zones, pc.zone_count, pc.max_volunteers, pc.max_admins, pc.status,
  to_char(pc.valid_until, 'YYYY-MM-DD') AS valid_until, pc.sync_mode, pc.sync_minutes, pc.booth_radius_m,
  (SELECT count(*)::int FROM memberships m WHERE m.party_constituency_id = pc.id AND m.status = 'approved' AND m.role = 'volunteer') AS volunteers,
  (SELECT count(*)::int FROM memberships m WHERE m.party_constituency_id = pc.id AND m.status = 'approved' AND m.role = 'admin') AS admins`;

type Row = Record<string, unknown> & { id: string; features: Record<string, boolean>; valid_until: string | null; status: string };
const toCustomer = (r: Row) => ({
  id: r.id, partyName: r.party_name, stateCode: r.state_code, acNo: r.ac_no, acName: r.ac_name,
  appName: r.app_name, logoUrl: r.logo_url, bannerUrl: r.banner_url ?? null, colour: r.brand_colour, candidateName: r.candidate_name, candidatePhotoUrl: r.candidate_photo_url,
  ballotNo: r.ballot_no, slogan: r.candidate_slogan, message: r.candidate_message, slipShareText: r.slip_share_text,
  features: featuresOf(r.features), defaultLang: r.regional_lang, languages: r.languages,
  maxZones: r.max_zones, zoneCount: r.zone_count, maxVolunteers: r.max_volunteers, maxAdmins: r.max_admins,
  status: r.status, validUntil: r.valid_until, volunteers: r.volunteers, admins: r.admins, syncMode: r.sync_mode, syncMinutes: r.sync_minutes, boothRadiusM: r.booth_radius_m,
  active: r.status === 'active' && (!r.valid_until || r.valid_until >= new Date().toISOString().slice(0, 10)),
});

async function loadCustomer(id: string) {
  const r = await core.query<Row>(`SELECT ${COLS} FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE pc.id = $1 AND pc.deleted_at IS NULL`, [id]);
  if (!r.rowCount) throw notFound();
  return r.rows[0];
}

/** Writes the given settings. Only keys present in `b` change. */
async function saveSettings(id: string, b: z.infer<typeof Settings>) {
  const cur = await loadCustomer(id);
  if (b.maxZones != null && b.maxZones < Number(cur.zone_count)) {
    throw invalid('max_below_used', `The admin uses ${cur.zone_count} zones. Set at least ${cur.zone_count}.`);
  }
  if (b.defaultLang && b.languages && !b.languages.includes(b.defaultLang)) throw invalid('lang_not_allowed', 'The default language must be one of the allowed languages.');
  const map: [keyof typeof b, string][] = [
    ['appName', 'app_name'], ['colour', 'brand_colour'], ['candidateName', 'candidate_name'], ['ballotNo', 'ballot_no'], ['slogan', 'candidate_slogan'],
    ['message', 'candidate_message'], ['slipShareText', 'slip_share_text'], ['defaultLang', 'regional_lang'], ['languages', 'languages'],
    ['maxZones', 'max_zones'], ['maxVolunteers', 'max_volunteers'], ['maxAdmins', 'max_admins'], ['status', 'status'], ['validUntil', 'valid_until'],
    ['syncMode', 'sync_mode'], ['syncMinutes', 'sync_minutes'], ['boothRadiusM', 'booth_radius_m'],
  ];
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, col] of map) {
    if (!(k in b)) continue;
    const v = b[k];
    params.push(typeof v === 'string' && v.trim() === '' ? null : v);
    sets.push(`${col} = $${params.length}`);
  }
  if (b.features) {
    params.push(JSON.stringify({ ...featuresOf(cur.features), ...b.features }));
    sets.push(`features = $${params.length}::jsonb`);
  }
  if (sets.length) await core.query(`UPDATE party_constituencies SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params);
}

/** Only real images, by their first bytes (not the file name). */
const Reason = z.string().trim().min(3, 'Write a short reason (3+ letters).').max(200);

export async function customerRoutes(app: FastifyInstance) {
  // ---------- Customers (C1–C7) ----------
  app.get('/v1/admin/customers', async () => {
    const r = await core.query<Row>(`SELECT ${COLS} FROM party_constituencies pc JOIN parties p ON p.id = pc.party_id WHERE pc.deleted_at IS NULL ORDER BY p.name, pc.state_code, pc.ac_no`);
    return r.rows.map(toCustomer);
  });

  app.get('/v1/admin/customers/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    return toCustomer(await loadCustomer(id));
  });

  app.patch('/v1/admin/customers/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(Settings, req.body);
    await saveSettings(id, b);
    const c = await loadCustomer(id);
    await audit({ actor: req.userId, role: 'super_admin', action: 'customer.update', entity: 'party_ac', entityId: id, stateCode: String(c.state_code), acNo: Number(c.ac_no), details: { fields: Object.keys(b) } });
    return toCustomer(c);
  });

  app.post('/v1/admin/customers/:id/copy', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const { fromId } = parse(z.object({ fromId: Uuid }), req.body);
    const src = toCustomer(await loadCustomer(fromId));
    await loadCustomer(id);
    await core.query(
      `UPDATE party_constituencies t SET app_name = s.app_name, logo_url = s.logo_url, banner_url = s.banner_url, brand_colour = s.brand_colour, candidate_name = s.candidate_name,
              candidate_photo_url = s.candidate_photo_url, ballot_no = s.ballot_no, candidate_slogan = s.candidate_slogan, candidate_message = s.candidate_message,
              slip_share_text = s.slip_share_text, features = s.features, regional_lang = s.regional_lang, languages = s.languages, updated_at = now()
         FROM party_constituencies s WHERE t.id = $1 AND s.id = $2`, [id, src.id]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'customer.copy', entity: 'party_ac', entityId: id, details: { fromId } });
    return toCustomer(await loadCustomer(id));
  });

  /** Logo, candidate photo (≤ 1 MB) or Home banner (≤ 2 MB); PNG/JPG/WebP by content. Served publicly at /files/<random>. */
  app.post('/v1/admin/customers/:id/upload', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const { kind } = parse(z.object({ kind: z.enum(['logo', 'photo', 'banner']) }), req.query);
    await loadCustomer(id);
    const url = await saveImage(req, kind === 'banner' ? 2 * 1024 * 1024 : 1024 * 1024);
    const col = kind === 'logo' ? 'logo_url' : kind === 'photo' ? 'candidate_photo_url' : 'banner_url';
    await core.query(`UPDATE party_constituencies SET ${col} = $2, updated_at = now() WHERE id = $1`, [id, url]);
    await audit({ actor: req.userId, role: 'super_admin', action: `customer.upload_${kind}`, entity: 'party_ac', entityId: id });
    return { url };
  });

  // ---------- Users (C8) ----------
  /** C8: all users (newest first), or a search; filters by role, status and customer; paged. */
  app.get('/v1/admin/users', async (req) => {
    const f = parse(z.object({
      q: z.string().trim().max(40).optional(),
      role: z.enum(['all', 'admin', 'volunteer', 'super']).default('all'),
      status: z.enum(['all', 'active', 'blocked']).default('all'),
      customer: Uuid.optional(),
      offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }), req.query);
    if (f.q && f.q.length < 3) throw invalid('q_short', 'Type at least 3 letters or digits.');
    const params: unknown[] = [];
    // Accounts without a mobile yet (new Google sign-ups) are listed too (accounts-access AC4).
    const where = ['u.deleted_at IS NULL'];
    if (f.q) { params.push(`%${f.q.replace(/[%_\\]/g, '\\$&')}%`); where.push(`(u.mobile LIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
    if (f.status !== 'all') { params.push(f.status); where.push(`u.status = $${params.length}`); }
    if (f.role === 'super') where.push('EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id AND pa.revoked_at IS NULL)');
    if (f.role === 'admin' || f.role === 'volunteer' || f.customer) {
      const cond: string[] = ["m.user_id = u.id", "m.status <> 'removed'"];
      if (f.role === 'admin' || f.role === 'volunteer') { params.push(f.role); cond.push(`m.role = $${params.length}`); }
      if (f.customer) { params.push(f.customer); cond.push(`m.party_constituency_id = $${params.length}`); }
      where.push(`EXISTS (SELECT 1 FROM memberships m WHERE ${cond.join(' AND ')})`);
    }
    const total = (await core.query<{ n: number }>(`SELECT count(*)::int AS n FROM users u WHERE ${where.join(' AND ')}`, params)).rows[0].n;
    params.push(f.limit, f.offset);
    const u = await core.query<{ id: string; name: string; mobile: string | null; email: string | null; status: string; blocked_reason: string | null; sup: boolean }>(
      `SELECT u.id, u.name, u.mobile, u.email, u.status, u.blocked_reason,
              EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = u.id AND pa.revoked_at IS NULL) AS sup
         FROM users u WHERE ${where.join(' AND ')}
        ORDER BY ${f.q ? 'u.name' : 'u.created_at DESC'}, u.id LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const ids = u.rows.map((x) => x.id);
    const ms = ids.length ? await core.query<{ id: string; user_id: string; role: string; status: string; party_name: string; state_code: string; ac_no: number; ac_name: string; party_ac_id: string; booths: number[] }>(
      `SELECT m.id, m.user_id, m.role, m.status, p.name AS party_name, trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, pc.id AS party_ac_id,
              COALESCE(array_agg(mb.part_no ORDER BY mb.part_no) FILTER (WHERE mb.part_no IS NOT NULL), '{}') AS booths
         FROM memberships m JOIN party_constituencies pc ON pc.id = m.party_constituency_id JOIN parties p ON p.id = pc.party_id
         LEFT JOIN membership_booths mb ON mb.membership_id = m.id
        WHERE m.user_id = ANY($1::uuid[]) AND m.status <> 'removed' GROUP BY m.id, p.name, pc.id ORDER BY p.name, pc.ac_no`, [ids]) : { rows: [] };
    const items = u.rows.map((x) => ({
      id: x.id, name: x.name, mobile: x.mobile, email: x.email, status: x.status, blockedReason: x.blocked_reason, isSuperAdmin: x.sup,
      memberships: ms.rows.filter((m) => m.user_id === x.id).map((m) => ({ id: m.id, role: m.role, status: m.status, partyName: m.party_name, stateCode: m.state_code, acNo: m.ac_no, acName: m.ac_name, partyAcId: m.party_ac_id, booths: m.booths })),
    }));
    return { items, total, offset: f.offset, limit: f.limit };
  });

  /** accounts-access AC4: fix a wrong or borrowed mobile number (it is not verified by SMS). */
  app.patch('/v1/admin/users/:id/mobile', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ mobile: Mobile.nullable(), reason: Reason }), req.body);
    await core.query('UPDATE users SET mobile = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL', [id, b.mobile]).catch((e: { code?: string }) => {
      if (e.code === '23505') throw new ApiError(409, 'mobile_taken', 'This mobile number is already used by another account.');
      throw e;
    });
    await audit({ actor: req.userId, role: 'super_admin', action: 'user.mobile', entity: 'user', entityId: id, details: { reason: b.reason } });
    return { ok: true };
  });

  app.post('/v1/admin/users/:id/block', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const { reason } = parse(z.object({ reason: Reason }), req.body);
    if (id === req.userId) throw invalid('self', 'You cannot block yourself.');
    const sup = await core.query<{ n: number; is: boolean }>(
      `SELECT (SELECT count(*)::int FROM platform_admins WHERE revoked_at IS NULL) AS n, EXISTS (SELECT 1 FROM platform_admins WHERE user_id = $1 AND revoked_at IS NULL) AS is`, [id]);
    if (sup.rows[0].is && sup.rows[0].n <= 1) throw invalid('last_super_admin', 'You cannot block the last super-admin.');
    const r = await core.query(`UPDATE users SET status = 'blocked', blocked_at = now(), blocked_reason = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id, reason]);
    if (!r.rowCount) throw notFound();
    await core.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    forgetUserStatus(id);
    await audit({ actor: req.userId, role: 'super_admin', action: 'user.block', entity: 'user', entityId: id, details: { reason } });
    return { ok: true };
  });

  app.post('/v1/admin/users/:id/unblock', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const { reason } = parse(z.object({ reason: Reason }), req.body);
    const r = await core.query(`UPDATE users SET status = 'active', blocked_at = NULL, blocked_reason = NULL, updated_at = now() WHERE id = $1 AND status = 'blocked' RETURNING id`, [id]);
    if (!r.rowCount) throw notFound();
    forgetUserStatus(id);
    await audit({ actor: req.userId, role: 'super_admin', action: 'user.unblock', entity: 'user', entityId: id, details: { reason } });
    return { ok: true };
  });

  app.post('/v1/admin/users/:id/signout', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const r = await core.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    await audit({ actor: req.userId, role: 'super_admin', action: 'user.signout', entity: 'user', entityId: id });
    return { ok: true, sessions: r.rowCount };
  });

  /** Change role, booths, or remove a person from one customer. */
  app.patch('/v1/admin/memberships/:id', async (req) => {
    const { id } = parse(z.object({ id: Uuid }), req.params);
    const b = parse(z.object({ reason: Reason, role: z.enum(['admin', 'volunteer']).optional(), booths: z.array(PartNo).min(1).max(20).optional(), remove: z.literal(true).optional() }).strict(), req.body);
    const m = await core.query<{ user_id: string; role: string; party_constituency_id: string; state_code: string; ac_no: number }>(
      `SELECT m.user_id, m.role, m.party_constituency_id, trim(pc.state_code) AS state_code, pc.ac_no FROM memberships m JOIN party_constituencies pc ON pc.id = m.party_constituency_id WHERE m.id = $1`, [id]);
    if (!m.rowCount) throw notFound();
    const cur = m.rows[0];
    if (b.remove) {
      await core.query(`UPDATE memberships SET status = 'removed', updated_at = now() WHERE id = $1`, [id]);
      await core.query('DELETE FROM membership_booths WHERE membership_id = $1', [id]);
      await notify([cur.user_id], 'removed', await areaOf(cur.party_constituency_id)); // accounts-access AC11
    } else {
      if (b.role && b.role !== cur.role) {
        if (b.role === 'admin') await checkLimit(cur.party_constituency_id, 'admin', id);
        await core.query(`UPDATE memberships SET role = $2, status = 'approved', decided_by = $3, decided_at = now(), updated_at = now() WHERE id = $1`, [id, b.role, req.userId]);
      }
      if (b.booths) {
        const pool = await statePool(cur.state_code);
        const valid = await pool.query('SELECT part_no FROM booths WHERE ac_no = $1 AND part_no = ANY($2::smallint[])', [cur.ac_no, b.booths]);
        if (valid.rowCount !== new Set(b.booths).size) throw invalid('booth_invalid', 'Pick booths from the list.');
        await core.query('DELETE FROM membership_booths WHERE membership_id = $1', [id]);
        for (const no of new Set(b.booths)) await core.query('INSERT INTO membership_booths (membership_id, part_no, approved_by) VALUES ($1,$2,$3)', [id, no, req.userId]);
      }
    }
    await audit({ actor: req.userId, role: 'super_admin', action: b.remove ? 'member.remove' : 'member.update', entity: 'membership', entityId: id, details: { reason: b.reason, role: b.role, booths: b.booths } });
    return { ok: true };
  });

  // ---------- Vote trace (C9), all parties ----------
  app.get('/v1/admin/trace', async (req) => {
    const q = parse(z.object({ state: z.string().regex(/^[A-Z]{2}$/), ac: z.coerce.number().int().min(1).max(999), epic: z.string().trim().min(3).max(20) }), req.query);
    return traceVoter(q.state, q.ac, { epic: q.epic }, 'ALL');
  });
}

