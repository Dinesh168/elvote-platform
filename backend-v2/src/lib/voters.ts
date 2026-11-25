/** Voter row → API shape (matches the app's `Voter` type), and drive segment → SQL filter. */
export interface VoterRow {
  id: string; part_no: number; sno: number; name: string; relation: string; relative_name: string | null; age: number | null;
  gender: string; house_no: string | null; section_no: number | null; section: string | null; epic: string; mobile: string | null;
  c_mobile: string | null; group_code: string | null; residence: string | null; needs_help: boolean | null;
  marked_at: Date | null; undone_at: Date | null; updated_at: Date | null;
  name_local: string | null; relative_name_local: string | null; section_local: string | null; is_new: boolean;
}

export const VOTER_SELECT = `
  SELECT v.id, v.part_no, v.sno, v.name, v.relation, v.relative_name, v.age, v.gender, v.house_no, v.section_no, v.section,
         v.name_local, v.relative_name_local, v.section_local, v.is_new,
         v.epic, v.mobile, c.mobile AS c_mobile, c.group_code, c.residence, c.needs_help,
         pm.marked_at, pm.undone_at, GREATEST(c.updated_at, pm.marked_at, pm.undone_at) AS updated_at
    FROM voters v
    LEFT JOIN voter_contacts c ON c.party_id = $1::uuid AND c.ac_no = v.ac_no AND c.voter_id = v.id
    LEFT JOIN poll_marks pm ON pm.election_id = $2::uuid AND pm.party_id = $1::uuid AND pm.ac_no = v.ac_no AND pm.voter_id = v.id`;

const rel = (relation: string, gender: string) => (relation === 'H' ? 'W/o' : gender === 'F' ? 'D/o' : 'S/o');

export function toVoter(r: VoterRow) {
  const voted = r.marked_at && !r.undone_at;
  return {
    id: r.id,
    booth: r.part_no,
    sno: r.sno,
    name: r.name,
    // spec bilingual-roll L3: the app picks the language; English is always present
    ...(r.name_local ? { nameLocal: r.name_local } : {}),
    ...(r.relative_name_local ? { relativeLocal: r.relative_name_local } : {}),
    ...(r.section_local ? { villageLocal: r.section_local } : {}),
    isNew: r.is_new,
    relation: rel(r.relation, r.gender),
    relative: r.relative_name ?? '',
    age: r.age ?? 0,
    gender: r.gender,
    house: r.house_no ?? '',
    ward: r.section_no != null ? String(r.section_no) : '',
    village: r.section ?? '',
    epic: r.epic,
    mobile: r.c_mobile ?? r.mobile ?? undefined,
    group: r.group_code ?? undefined,
    residence: r.residence ?? 'here',
    needsHelp: !!r.needs_help,
    votedAt: voted ? r.marked_at!.toISOString() : undefined,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : undefined,
  };
}

/** spec easy-redesign B4: people with "see phone numbers" switched off get 98xxxxx210. */
export const maskMobile = (n: string) => (n.length > 5 ? `${n.slice(0, 2)}${'x'.repeat(n.length - 5)}${n.slice(-3)}` : 'xxxxx');
export function voterFor(deny: readonly string[]) {
  const hide = deny.includes('phones');
  return (r: VoterRow) => {
    const v = toVoter(r);
    return hide && v.mobile ? { ...v, mobile: maskMobile(v.mobile) } : v;
  };
}

export interface Segment {
  gender?: 'M' | 'F' | 'T';
  ageMin?: number;
  ageMax?: number;
  group?: 'our' | 'target' | 'opp';
  residence?: 'here' | 'moved';
}

export const DRIVE_SEGMENTS: Record<string, Segment> = {
  women: { gender: 'F' },
  first_time: { ageMin: 18, ageMax: 20 },
  young: { ageMin: 18, ageMax: 34 },
  senior: { ageMin: 60 },
  target: { group: 'target' },
  our: { group: 'our' },
  migrated: { residence: 'moved' },
  other: {},
};

export const DRIVE_NAMES: Record<string, string> = {
  women: 'Women outreach', first_time: 'First-time voters outreach', young: 'Young voters outreach', senior: 'Senior citizen outreach',
  target: 'Target voter outreach', our: 'Our voters outreach', migrated: 'Migrated voter outreach', other: 'Other',
};

/**
 * Appends segment conditions with bound parameters. `v` = voters alias, `c` = voter_contacts alias.
 * Returns SQL text (starting with " AND …" or empty).
 */
export function segmentSql(seg: Segment, params: unknown[]): string {
  const parts: string[] = [];
  const p = (x: unknown) => { params.push(x); return `$${params.length}`; };
  if (seg.gender) parts.push(`v.gender = ${p(seg.gender)}`);
  if (seg.ageMin != null) parts.push(`v.age >= ${p(seg.ageMin)}`);
  if (seg.ageMax != null) parts.push(`v.age <= ${p(seg.ageMax)}`);
  if (seg.group) parts.push(`c.group_code = ${p(seg.group)}`);
  if (seg.residence) parts.push(`COALESCE(c.residence, 'here') = ${p(seg.residence)}`);
  return parts.length ? ' AND ' + parts.join(' AND ') : '';
}
