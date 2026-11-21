/**
 * Who may do what. Every scoped route resolves the caller's membership here; the client never decides access.
 */
import { core } from '../db/pools.js';
import { ApiError, forbidden } from './errors.js';

export interface Membership {
  id: string;
  userId: string;
  role: 'admin' | 'volunteer';
  status: string;
  partyId: string;
  partyName: string;
  partyAcId: string;
  stateCode: string;
  acNo: number;
  acName: string;
  maxZones: number;
  zoneCount: number;
  booths: number[]; // part numbers (volunteer scope)
  /** Customer settings (spec customer-cms). */
  features: Features;
  active: boolean; // customer status active and not past valid_until
  look: Look;
  /** Sync mode set by the super-admin (spec sync-modes SD1–SD3). */
  sync: { mode: 'live' | 'offline' | 'scheduled'; minutes: number };
  /** Polling day: counts as at the booth within this many metres (spec polling-day S3). */
  boothRadiusM: number;
  /** Super-admin working inside this team as its admin (spec usability-r2 S2): no membership row; id = team id. */
  asSuperAdmin?: boolean;
}

export const FEATURE_KEYS = ['map', 'poll', 'zones', 'tasks', 'slip', 'surnames', 'help', 'boothGps'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type Features = Record<FeatureKey, boolean>;
export interface Look {
  appName: string | null; logoUrl: string | null; bannerUrl: string | null; colour: string | null;
  candidateName: string | null; candidatePhotoUrl: string | null; ballotNo: number | null; slogan: string | null;
  message: string | null; slipShareText: string | null; defaultLang: string | null; languages: string[];
}

const BASE = `
  SELECT m.id, m.user_id, m.role, m.status, pc.party_id, p.name AS party_name, pc.id AS party_ac_id,
         trim(pc.state_code) AS state_code, pc.ac_no, pc.ac_name, pc.max_zones, pc.zone_count,
         pc.features, (pc.status = 'active' AND (pc.valid_until IS NULL OR pc.valid_until >= current_date)) AS active,
         pc.app_name, pc.logo_url, pc.banner_url, pc.brand_colour, pc.candidate_name, pc.candidate_photo_url, pc.ballot_no, pc.candidate_slogan,
         pc.candidate_message, pc.slip_share_text, pc.regional_lang, pc.languages, pc.sync_mode, pc.sync_minutes, pc.booth_radius_m,
         COALESCE(array_agg(mb.part_no ORDER BY mb.part_no) FILTER (WHERE mb.part_no IS NOT NULL), '{}') AS booths
    FROM memberships m
    JOIN party_constituencies pc ON pc.id = m.party_constituency_id AND pc.deleted_at IS NULL
    JOIN parties p ON p.id = pc.party_id AND p.deleted_at IS NULL
    LEFT JOIN membership_booths mb ON mb.membership_id = m.id`;

type Row = {
  id: string; user_id: string; role: 'admin' | 'volunteer'; status: string; party_id: string; party_name: string; party_ac_id: string;
  state_code: string; ac_no: number; ac_name: string; max_zones: number; zone_count: number; booths: number[];
  features: Partial<Features>; active: boolean; app_name: string | null; logo_url: string | null; banner_url: string | null; brand_colour: string | null;
  candidate_name: string | null; candidate_photo_url: string | null; ballot_no: number | null; candidate_slogan: string | null;
  candidate_message: string | null; slip_share_text: string | null; regional_lang: string | null; languages: string[];
  sync_mode: 'live' | 'offline' | 'scheduled'; sync_minutes: number; booth_radius_m: number;
};
export const featuresOf = (f: Partial<Features> | null | undefined): Features =>
  Object.fromEntries(FEATURE_KEYS.map((k) => [k, f?.[k] !== false])) as Features;
const map = (r: Row): Membership => ({
  id: r.id, userId: r.user_id, role: r.role, status: r.status, partyId: r.party_id, partyName: r.party_name, partyAcId: r.party_ac_id,
  stateCode: r.state_code, acNo: r.ac_no, acName: r.ac_name, maxZones: r.max_zones, zoneCount: r.zone_count, booths: r.booths,
  features: featuresOf(r.features), active: r.active,
  look: {
    appName: r.app_name, logoUrl: r.logo_url, bannerUrl: r.banner_url ?? null, colour: r.brand_colour, candidateName: r.candidate_name, candidatePhotoUrl: r.candidate_photo_url,
    ballotNo: r.ballot_no, slogan: r.candidate_slogan, message: r.candidate_message, slipShareText: r.slip_share_text,
    defaultLang: r.regional_lang, languages: r.languages ?? ['en', 'pa'],
  },
  sync: { mode: r.sync_mode ?? 'live', minutes: r.sync_minutes ?? 15 },
  boothRadiusM: r.booth_radius_m ?? 300,
});

export async function membershipsOf(userId: string): Promise<Membership[]> {
  const r = await core.query<Row>(`${BASE} WHERE m.user_id = $1 GROUP BY m.id, pc.id, p.id ORDER BY m.created_at`, [userId]);
  return r.rows.map(map);
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const r = await core.query('SELECT 1 FROM platform_admins WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  return !!r.rowCount;
}

const TEAM = BASE
  .replace('SELECT m.id, m.user_id, m.role, m.status,', `SELECT pc.id, $2::uuid AS user_id, 'admin' AS role, 'approved' AS status,`)
  .replace(/FROM memberships m\s+JOIN party_constituencies pc ON pc.id = m.party_constituency_id AND pc.deleted_at IS NULL/, 'FROM party_constituencies pc')
  .replace('LEFT JOIN membership_booths mb ON mb.membership_id = m.id', 'LEFT JOIN membership_booths mb ON false');

/**
 * S2: the super-admin opens a team (party · AC, by its id) with full admin rights. Every write is audit-logged with
 * the super-admin as the actor (`actorRole` = super_admin). Callers must have checked isSuperAdmin.
 */
export async function teamAsSuperAdmin(userId: string, partyAcId: string): Promise<Membership> {
  const r = await core.query<Row>(`${TEAM} WHERE pc.id = $1 GROUP BY pc.id, p.id`, [partyAcId, userId]);
  if (!r.rows[0]) throw forbidden();
  return { ...map(r.rows[0]), asSuperAdmin: true };
}

/** Audit role for a write made through a membership. */
export const actorRole = (m: Membership): 'admin' | 'super_admin' => (m.asSuperAdmin ? 'super_admin' : 'admin');

/** Loads an approved membership that belongs to the caller. */
export async function requireMembership(userId: string, membershipId: string, role?: 'admin'): Promise<Membership> {
  const r = await core.query<Row>(`${BASE} WHERE m.id = $1 AND m.user_id = $2 GROUP BY m.id, pc.id, p.id`, [membershipId, userId]);
  if (!r.rows[0] && (await isSuperAdmin(userId))) return teamAsSuperAdmin(userId, membershipId);
  const m = r.rows[0] && map(r.rows[0]);
  if (!m || m.status !== 'approved') throw forbidden();
  if (role === 'admin' && m.role !== 'admin') throw forbidden();
  if (!m.active) throw new ApiError(403, 'subscription_ended', 'This team’s subscription has ended. Contact your provider.');
  return m;
}

/** C3: a feature turned off for this customer is refused by the server too. */
export function requireFeature(m: Membership, key: FeatureKey) {
  if (!m.features[key]) throw new ApiError(403, 'feature_off', 'This feature is not part of your plan.');
}

/** CD8: blocked users are refused on every request. Status is cached for 60 s per user. */
const statusCache = new Map<string, { ok: boolean; until: number }>();
export async function assertUserActive(userId: string) {
  const hit = statusCache.get(userId);
  if (hit && hit.until > Date.now()) {
    if (!hit.ok) throw new ApiError(401, 'user_blocked', 'Your access is paused. Contact your provider.');
    return;
  }
  const r = await core.query<{ status: string; pending: boolean }>('SELECT status, deletion_requested_at IS NOT NULL AS pending FROM users WHERE id = $1', [userId]);
  const ok = !!r.rows[0] && r.rows[0].status === 'active' && !r.rows[0].pending;
  if (statusCache.size > 50_000) statusCache.clear();
  statusCache.set(userId, { ok, until: Date.now() + 60_000 });
  if (!ok) throw new ApiError(401, 'user_blocked', 'Your access is paused. Contact your provider.');
}
/** Same process: forget a cached status at once (block/unblock here takes effect immediately). */
export const forgetUserStatus = (userId: string) => statusCache.delete(userId);

/** Volunteers are limited to their booths; admins see the whole AC. */
export function requireBooth(m: Membership, partNo: number) {
  if (m.role === 'admin') return;
  if (!m.booths.includes(partNo)) throw forbidden('booth_forbidden');
}

export async function requireSuperAdmin(userId: string) {
  if (!(await isSuperAdmin(userId))) throw forbidden();
}

export async function audit(e: {
  actor: string; role: string; action: string; partyId?: string | null; stateCode?: string | null; acNo?: number | null;
  entity?: string; entityId?: string; details?: Record<string, unknown>;
}) {
  await core.query(
    `INSERT INTO audit_log (actor_user_id, actor_role, action, party_id, state_code, ac_no, entity, entity_id, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [e.actor, e.role, e.action, e.partyId ?? null, e.stateCode ?? null, e.acNo ?? null, e.entity ?? null, e.entityId ?? null, JSON.stringify(e.details ?? {})],
  );
}

/** C5: max volunteers / admins per customer. `except` = the membership being approved or promoted (not counted twice). */
export async function checkLimit(partyAcId: string, role: 'volunteer' | 'admin', except?: string) {
  const r = await core.query<{ lim: number | null; n: number }>(
    `SELECT CASE WHEN $2 = 'admin' THEN pc.max_admins ELSE pc.max_volunteers END AS lim,
            (SELECT count(*)::int FROM memberships m WHERE m.party_constituency_id = pc.id AND m.role = $2 AND m.status = 'approved'
               AND m.source = 'direct' -- whole-state admins are party-level and not counted (accounts-access AC8)
               AND ($3::uuid IS NULL OR m.id <> $3::uuid)) AS n
       FROM party_constituencies pc WHERE pc.id = $1`,
    [partyAcId, role, except ?? null],
  );
  const x = r.rows[0];
  if (x && x.lim != null && x.n >= x.lim) {
    throw new ApiError(409, role === 'admin' ? 'limit_admins' : 'limit_volunteers',
      role === 'admin' ? `This team can have at most ${x.lim} admins. Contact your provider.` : `This team can have at most ${x.lim} volunteers. Contact your provider.`);
  }
}
