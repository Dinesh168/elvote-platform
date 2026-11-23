/** Admin + super-admin API (backend-v2). Types mirror the server responses. */
import { http } from './http';
import type { MeInfo, MembershipInfo } from '@/stores/session';

export interface Totals {
  total: number; met: number; our: number; target: number; opp: number; moved: number;
  withMobile: number; ourMobile: number; targetMobile: number; oppMobile: number;
  houses: number; housesVisited: number; housesWithMobile: number; ourHouses: number; targetHouses: number; oppHouses: number;
  firstTime: number; young: number; mid: number; senior: number; male: number; female: number; third: number;
  helpNeeded: number; voted: number; ourVoted: number; targetVoted: number; oppVoted: number; helpVoted: number;
}

export interface Dashboard {
  /** spec map-trend Y1, Q1 */
  yesterday?: { met: number; metChange: number | null; ours: number; oursChange: number | null; bestBooth: number | null };
  quiet?: { userId: string; name: string; booths: number[]; days: number | null }[];
  scope: { zone: string | null; booth: number | null; acNo: number; acName: string };
  visitedToday: number;
  totals: Totals;
  pollingStations: { total: number; strong: number; moderate: number; weak: number; withWorker: number; withoutWorker: number };
  charts: {
    groups: { our: number; target: number; opp: number; notMet: number };
    ages: { firstTime: number; young: number; mid: number; senior: number };
    strength: { S: number; M: number; W: number };
    houses: { our: number; target: number; opp: number; notVisited: number };
    zones: { id: string; name: string; booths: number; total: number; met: number; pct: number }[];
    trend: { day: string; contacted: number }[];
  };
  topWorkers: { userId: string; name: string; contacted: number; today: number }[];
}

export interface BoothRow { no: number; name: string; zone: string | null; strength: 'S' | 'M' | 'W'; strengthSource?: 'admin' | 'auto'; workers: number; total: number; met: number; houses: number; housesVisited: number; withMobile: number; our: number; target: number; opp: number }
export interface Surnames { voters: number; surnames: { surname: string; total: number; met: number; our: number; target: number; opp: number }[] }
export interface Zones { maxZones: number; zoneCount: number; zones: { id: string; number: number; name: string; booths: number[] }[]; unassigned: number[] }
export interface TeamMember { membershipId: string; userId: string; name: string; mobile: string; epic: string | null; role: 'admin' | 'volunteer'; status: string; requestedAt: string; rejectReason: string | null; booths: number[]; contactedToday: number; contactedTotal: number; lastSyncAt?: string | null; unsent?: number }
export interface Drive { id: string; kind: string; name: string; startsOn: string; endsOn: string; scope: string; status: 'not_started' | 'ongoing' | 'completed'; daysLeft: number; targeted: number; completed: number; pct: number; byZone: { zone: string; targeted: number; completed: number; pct: number }[] }
export interface Poll { total: number; voted: number; pct: number; notVoted: { our: number; target: number; opp: number }; helpPending: number; zones: { name: string; total: number; voted: number; pct: number }[]; booths: { no: number; name: string; total: number; voted: number; pct: number; ourNotVoted: number; helpPending: number }[] }
export interface MapBooth { no: number; name: string; lat: number | null; lng: number | null; total: number; met: number; our: number; target: number; opp: number; strength: string; zone: string | null; pct: number }

const m = (mid: string) => `/v1/m/${mid}`;
const qs = (o: Record<string, string | number | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
};

export const adminApi = {
  /** spec onboarding-branding OB8: the team's Home banner (admin). */
  uploadBanner: (mid: string, form: FormData) => http.form<{ url: string }>(`/v1/m/${mid}/banner`, form),
  removeBanner: (mid: string) => http.del<{ ok: boolean }>(`/v1/m/${mid}/banner`),
  dashboard: (mid: string, f: { zone?: string; booth?: number } = {}) => http.get<Dashboard>(`${m(mid)}/dashboard${qs(f)}`),
  boothTable: (mid: string, zone?: string) => http.get<BoothRow[]>(`${m(mid)}/booth-table${qs({ zone })}`),
  setStrength: (mid: string, no: number, strength: 'S' | 'M' | 'W') => http.put(`${m(mid)}/booths/${no}/strength`, { strength }),
  /** spec real-demo-data B3: back to the worked-out strength. */
  resetStrength: (mid: string, no: number) => http.del(`${m(mid)}/booths/${no}/strength`),
  zones: (mid: string) => http.get<Zones>(`${m(mid)}/zones`),
  /** spec usability-r2 A2: surnames of the assembly (optionally one zone or booth). */
  surnames: (mid: string, f: { zone?: string; booth?: number } = {}) => http.get<Surnames>(`${m(mid)}/surnames${qs(f)}`),
  setZoneCount: (mid: string, count: number) => http.put<{ zoneCount: number }>(`${m(mid)}/zones/count`, { count }),
  renameZone: (mid: string, id: string, name: string) => http.patch(`${m(mid)}/zones/${id}`, { name }),
  moveBooths: (mid: string, booths: number[], zoneId: string | null) => http.put(`${m(mid)}/zones/booths`, { booths, zoneId }),
  team: (mid: string, status: 'pending' | 'approved' | 'rejected', q?: string) => http.get<TeamMember[]>(`${m(mid)}/team${qs({ status, q })}`),
  approve: (mid: string, membershipId: string, booths: number[]) => http.post(`${m(mid)}/team/${membershipId}/approve`, { booths }),
  reject: (mid: string, membershipId: string, reason: string) => http.post(`${m(mid)}/team/${membershipId}/reject`, { reason }),
  newJoinCode: (mid: string) => http.post<{ code: string }>(`${m(mid)}/join-code`),
  drives: (mid: string) => http.get<Drive[]>(`${m(mid)}/drives`),
  createDrive: (mid: string, d: { kind: string; customName?: string; startsOn: string; endsOn: string; scope: 'all' | 'zones' | 'booths'; zoneIds?: string[]; booths?: number[] }) =>
    http.post<{ id: string }>(`${m(mid)}/drives`, d),
  deleteDrive: (mid: string, id: string) => http.del(`${m(mid)}/drives/${id}`),
  poll: (mid: string) => http.get<Poll>(`${m(mid)}/poll`),
  map: (mid: string) => http.get<MapBooth[]>(`${m(mid)}/map`),
  /** C9 vote trace (own party, own AC). */
  trace: (mid: string, q: { epic?: string; booth?: number; sno?: number }) => http.get<Trace>(`${m(mid)}/trace${qs(q)}`),
  // Polling day (spec polling-day A1, A2, S2)
  polling: (mid: string) => http.get<PollingPage>(`${m(mid)}/polling`),
  pollingAlerts: (mid: string) => http.get<{ items: PdAlert[]; unseen: number }>(`${m(mid)}/polling/alerts`),
  pollingSeen: (mid: string) => http.post(`${m(mid)}/polling/alerts/seen`),
  setBoothLocation: (mid: string, no: number, lat: number, lng: number) => http.put(`${m(mid)}/booths/${no}/location`, { lat, lng }),
  /** spec bilingual-roll U6/U9 */
  roll: (mid: string) => http.get<RollInfo>(`${m(mid)}/roll`),
  /** spec map-trend T3–T5, W1, Q1 */
  trend: (mid: string, f: { level: TrendLevel; key?: string; party?: string }) => http.get<Trend>(`${m(mid)}/trend${qs(f)}`),
  resultsMap: (mid: string, f: { year?: number; party?: string } = {}) => http.get<ResultsMap>(`${m(mid)}/results-map${qs(f)}`),
  winPlan: (mid: string, party?: string) => http.get<WinPlan>(`${m(mid)}/win-plan${qs({ party })}`),
  remind: (mid: string, userIds: string[], template: RemindTemplate) => http.post<{ sent: number; skipped: number }>(`${m(mid)}/remind`, { userIds, template }),
};

export type TrendLevel = 'assembly' | 'zone' | 'booth' | 'village';
export type BoothGroup = 'safe' | 'swing' | 'tough';
export type RemindTemplate = 'booth_needs_you' | 'days_left' | 'call_me';
export interface TrendYear { year: number; total: number; votes: Record<string, number>; shares: Record<string, number>; ours: number; winner: string | null; margin: number; estimated?: number }
export interface TrendChild { key: string; name: string; ours: number | null; swing: number | null; winner: string | null; margin: number | null; group: BoothGroup | null }
export interface Trend {
  acNo: number; acName: string; level: TrendLevel; key: string | null; name: string; parties: string[]; party: string | null; sample: boolean;
  years: TrendYear[]; swing: number | null; margin: number | null; children: TrendChild[]; closeLosses: number[];
  group?: BoothGroup; toWin?: { needed: number; oursFound: number; toGo: number }; metPct?: number;
}
export interface ResultsMapBooth { partNo: number; name: string; lat: number | null; lng: number | null; winner: string | null; ours: number; margin: number; prevOurs: number | null; metPct: number }
export interface ResultsMap { year: number | null; years: number[]; party: string | null; parties: string[]; booths: ResultsMapBooth[]; legend: { won: number; lost: number; lostUnder50: number } }
export interface WinPlan {
  year: number | null; party: string | null; winnerVotes?: number; rivalVotes: number | null; needed: number | null; oursFound: number; toGo: number | null;
  groups: Record<BoothGroup, { booths: number[]; count: number }>; uncoveredSwing: number[];
}

export type RollKind = 'draft' | 'final' | 'supplement';
export interface RollInfo {
  kind: RollKind | null; publishedOn: string | null; appliedAt: string | null; notInRoll: number; newCount: number;
  notInRollList: { epic: string; name: string; nameLocal: string | null; booth: number; sno: number }[];
}

export type PdStatus = 'checking' | 'at_booth' | 'away' | 'location_off' | 'no_booth_location' | 'not_reporting' | 'not_shared';
export interface PdElection { id: string; name: string; kind: string; date: string; opensAt: string; closesAt: string }
export interface PdVolunteer {
  membershipId: string; name: string; mobile: string | null; booths: number[]; status: PdStatus; permission: string | null;
  distanceM: number | null; partNo: number | null; lat: number | null; lng: number | null; reportedAt: string | null;
}
export interface PdBooth { no: number; name: string; lat: number | null; lng: number | null; volunteers: number; atBooth: number }
export interface PollingPage {
  election: PdElection | null; inWindow: boolean; radiusM: number; unseen: number;
  tiles: { atBooth: number; away: number; notReporting: number; locationOff: number; notShared: number; missing: number; checking: number; sharing: number; unattendedBooths: number; boothsMissingLocation: number };
  booths: PdBooth[]; volunteers: PdVolunteer[];
}
export interface PdAlert { id: string; kind: 'left' | 'still_away' | 'returned' | 'location_off' | 'location_on'; membershipId: string; name: string; partNo: number | null; distanceM: number | null; at: string }
export interface Election extends PdElection { stateCode: string; stateName: string; acNos: number[] | null; status: 'upcoming' | 'polling' | 'done' | 'cancelled'; inWindow: boolean }
export type ElectionInput = { stateCode: string; kind: 'assembly' | 'parliament' | 'local' | 'bye'; name: string; pollDate: string; acNos: number[] | null; opensAt: string; closesAt: string };
export interface AdminBooth { no: number; name: string; locality: string | null; lat: number | null; lng: number | null; source: 'upload' | 'gps' | 'edited' | null }

export interface TraceEvent { at: string; by: string; party: string; change: Record<string, unknown>; source: string }
export interface Trace { voter: { id: string; name: string; epic: string; booth: number; sno: number; house: string | null; age: number | null; relative: string | null }; events: TraceEvent[] }

export type FeatureKey = 'map' | 'poll' | 'zones' | 'tasks' | 'slip' | 'surnames' | 'help' | 'boothGps';
export interface Customer {
  id: string; partyName: string; stateCode: string; acNo: number; acName: string;
  appName: string | null; logoUrl: string | null; bannerUrl?: string | null; colour: string | null; candidateName: string | null; candidatePhotoUrl: string | null;
  ballotNo: number | null; slogan: string | null; message: string | null; slipShareText: string | null;
  features: Record<FeatureKey, boolean>; defaultLang: 'en' | 'hi' | 'pa' | null; languages: ('en' | 'hi' | 'pa')[];
  maxZones: number; zoneCount: number; maxVolunteers: number | null; maxAdmins: number | null;
  status: 'active' | 'paused' | 'closed'; validUntil: string | null; volunteers: number; admins: number; active: boolean;
  syncMode: 'live' | 'offline' | 'scheduled'; syncMinutes: number;
  boothRadiusM: number;
}
export type CustomerPatch = Partial<Omit<Customer, 'id' | 'partyName' | 'stateCode' | 'acNo' | 'acName' | 'logoUrl' | 'bannerUrl' | 'candidatePhotoUrl' | 'zoneCount' | 'volunteers' | 'admins' | 'active' | 'features'>> & { features?: Partial<Record<FeatureKey, boolean>> };
export type UserFilter = { q?: string; role?: 'all' | 'admin' | 'volunteer' | 'super'; status?: 'all' | 'active' | 'blocked'; customer?: string; offset?: number; limit?: number };
export interface AdminUser {
  id: string; name: string; mobile: string | null; email?: string | null; status: 'active' | 'blocked'; blockedReason: string | null; isSuperAdmin: boolean;
  memberships: { id: string; role: 'admin' | 'volunteer'; status: string; partyName: string; stateCode: string; acNo: number; acName: string; partyAcId: string; booths: number[] }[];
}

export interface Overview {
  states: { code: string; name: string; nameLocal?: string; acs: number; booths: number; voters: number }[];
  partyAcs: { id: string; partyId: string; partyName: string; stateCode: string; acNo: number; acName: string; maxZones: number; zoneCount: number; status: string; admins: number; volunteers: number; pending: number; voters: number; met: number; voted: number }[];
}
export interface RollSummary { unchanged: number; changed: number; moved: number; new: number; back: number; held: number; notInRoll: number }
export interface HeldRow { rowNo: number; epic: string; name: string; otherAc: number; decision: 'move' | 'reject' | null }
export interface ImportJob {
  id: string; ac_no: number; ac_name?: string; file_name: string; status: string; rows_total: number; rows_ok: number; rows_failed: number; message: string | null;
  created_at: string; errors?: { row: number; error: string }[]; roll_kind?: RollKind; published_on?: string | null;
  /** spec bilingual-roll U3: what applying would change */
  summary?: RollSummary | null;
  lists?: { moved: { epic: string; name: string; from: number; to: number }[]; new: { epic: string; name: string; part: number }[]; notInRoll: { epic: string; name: string; part: number }[]; held: HeldRow[] } | null;
}

export const platformApi = {
  /** spec map-trend T2: past election results (super-admin only). */
  pastResults: (state: string) => http.get<{ items: { acNo: number; year: number; booths: number; sample: boolean; loadedAt: string }[] }>(`/v1/admin/past-results?state=${state}`),
  uploadPastResults: (stateCode: string, csv: string, sample: boolean) => http.post<{ rows: number; acs: number[]; years: number[]; parties: string[] }>('/v1/admin/past-results', { stateCode, csv, sample }),
  deletePastResults: (state: string, ac: number, year: number) => http.del<{ deleted: number }>(`/v1/admin/past-results?state=${state}&ac=${ac}&year=${year}`),
  overview: () => http.get<Overview>('/v1/admin/overview'),
  acs: (state: string) => http.get<{ acNo: number; name: string; nameLocal: string | null; regionalLang: 'hi' | 'pa'; booths: number; voters: number }[]>(`/v1/admin/acs?state=${state}`),
  setAc: (state: string, ac: number, p: { regionalLang?: 'hi' | 'pa'; nameLocal?: string }) => http.patch(`/v1/admin/acs/${state}/${ac}`, p),
  parties: () => http.get<{ id: string; name: string; shortName: string | null; acs: number; states: string[] }[]>('/v1/admin/parties'),
  /** spec party-states A3: [] = national (every state). */
  setPartyStates: (id: string, states: string[]) => http.put<{ ok: true; states: string[] }>(`/v1/admin/parties/${id}/states`, { states }),
  addParty: (name: string, shortName?: string) => http.post<{ id: string }>('/v1/admin/parties', { name, shortName: shortName || undefined }),
  addPartyAc: (partyId: string, stateCode: string, acNo: number, maxZones: number) => http.post<{ id: string }>('/v1/admin/party-acs', { partyId, stateCode, acNo, maxZones }),
  updatePartyAc: (id: string, p: { maxZones?: number; status?: string }) => http.patch(`/v1/admin/party-acs/${id}`, p),
  clearPartyAc: (id: string, passKey: string, confirmAcNo: number) => http.post<{ contacts: number; events: number; pollMarks: number }>(`/v1/admin/party-acs/${id}/clear`, { passKey, confirmAcNo }),
  admins: () => http.get<{ userId: string; name: string; mobile: string; partyName: string; stateCode: string; acNo: number; acName: string; partyAcId: string }[]>('/v1/admin/admins'),
  /** spec accounts-access AC12: by Google / sign-in email (a mobile only in local test mode). */
  addAdmin: (who: { email?: string; mobile?: string }, name: string, partyAcId: string) => http.post('/v1/admin/admins', { ...who, name, partyAcId }),
  superAdmins: () => http.get<{ userId: string; name: string; mobile: string | null; email?: string | null; since: string }[]>('/v1/admin/super-admins'),
  /** spec accounts-access AC12: by Google / sign-in email (a mobile only in local test mode). */
  addSuperAdmin: (who: { email?: string; mobile?: string }, name: string) => http.post('/v1/admin/super-admins', { ...who, name }),
  removeSuperAdmin: (userId: string) => http.del(`/v1/admin/super-admins/${userId}`),
  imports: (state: string) => http.get<ImportJob[]>(`/v1/admin/imports?state=${state}`),
  importJob: (state: string, id: string) => http.get<ImportJob>(`/v1/admin/imports/${id}?state=${state}`),
  upload: (form: FormData) => http.form<{ jobId: string; stateCode: string }>('/v1/admin/imports', form),
  confirmImport: (state: string, id: string) => http.post(`/v1/admin/imports/${id}/confirm?state=${state}`),
  cancelImport: (state: string, id: string) => http.post(`/v1/admin/imports/${id}/cancel?state=${state}`),
  decideHeld: (state: string, id: string, body: { all: 'move' | 'reject' } | { decisions: { rowNo: number; decision: 'move' | 'reject' }[] }) =>
    http.post<{ held: HeldRow[] }>(`/v1/admin/imports/${id}/held?state=${state}`, body),
  // Customer CMS, users, vote trace (spec customer-cms)
  customers: () => http.get<Customer[]>('/v1/admin/customers'),
  customer: (id: string) => http.get<Customer>(`/v1/admin/customers/${id}`),
  saveCustomer: (id: string, p: CustomerPatch) => http.patch<Customer>(`/v1/admin/customers/${id}`, p),
  copyCustomer: (id: string, fromId: string) => http.post<Customer>(`/v1/admin/customers/${id}/copy`, { fromId }),
  uploadImage: (id: string, kind: 'logo' | 'photo' | 'banner', form: FormData) => http.form<{ url: string }>(`/v1/admin/customers/${id}/upload?kind=${kind}`, form),
  users: (f: UserFilter = {}) => http.get<{ items: AdminUser[]; total: number; offset: number; limit: number }>(`/v1/admin/users${qs(f)}`),
  block: (id: string, reason: string) => http.post(`/v1/admin/users/${id}/block`, { reason }),
  unblock: (id: string, reason: string) => http.post(`/v1/admin/users/${id}/unblock`, { reason }),
  signOutUser: (id: string) => http.post(`/v1/admin/users/${id}/signout`),
  updateMembership: (id: string, p: { reason: string; role?: 'admin' | 'volunteer'; booths?: number[]; remove?: true }) => http.patch(`/v1/admin/memberships/${id}`, p),
  trace: (state: string, ac: number, epic: string) => http.get<Trace>(`/v1/admin/trace?state=${state}&ac=${ac}&epic=${encodeURIComponent(epic)}`),
  // Polling day (spec polling-day S1–S3, A2)
  elections: () => http.get<Election[]>('/v1/admin/elections'),
  addElection: (e: ElectionInput) => http.post<{ id: string }>('/v1/admin/elections', e),
  updateElection: (state: string, id: string, p: Partial<Omit<ElectionInput, 'stateCode'>> & { status?: Election['status'] }) => http.patch<Election>(`/v1/admin/elections/${state}/${id}`, p),
  booths: (state: string, ac: number, missing?: boolean) => http.get<{ items: AdminBooth[]; total: number; missing: number }>(`/v1/admin/booths${qs({ state, ac, missing: missing ? 1 : undefined })}`),
  setBooth: (state: string, ac: number, no: number, p: { lat: number | null; lng: number | null }) => http.patch(`/v1/admin/booths/${state}/${ac}/${no}`, p),
  boothLocations: (stateCode: string, acNo: number, rows: { no: number; lat: number; lng: number }[], dryRun: boolean) =>
    http.post<{ ok: number; saved: number; errors: { line: number; no: number; error: 'booth_unknown' | 'out_of_range' }[] }>('/v1/admin/booths/locations', { stateCode, acNo, rows, dryRun }),
  customerPolling: (id: string) => http.get<PollingPage>(`/v1/admin/customers/${id}/polling`),
  // spec accounts-access AC7, AC8, AC10, AC4
  accessRequests: (status: 'pending' | 'all' = 'pending') => http.get<AccessRequestRow[]>(`/v1/admin/access-requests${qs({ status })}`),
  approveAccess: (id: string, p: { partyId?: string; newPartyName?: string; stateCode: string; wholeState?: boolean; acNos?: number[]; createMissing?: boolean }) =>
    http.post<{ ok: boolean; partyId: string }>(`/v1/admin/access-requests/${id}/approve`, p),
  rejectAccess: (id: string, reason: string) => http.post(`/v1/admin/access-requests/${id}/reject`, { reason }),
  adminAccess: (userId: string) => http.get<AdminAccess>(`/v1/admin/users/${userId}/admin-access`),
  addAdminAccess: (userId: string, p: { partyId: string; stateCode: string; wholeState?: boolean; acNos?: number[]; createMissing?: boolean }) =>
    http.post<AdminAccess>(`/v1/admin/users/${userId}/admin-access`, p),
  removeStateAccess: (userId: string, partyId: string, state: string) => http.del<AdminAccess>(`/v1/admin/users/${userId}/admin-access/state/${partyId}/${state}`),
  volunteerRequests: (customerId: string) => http.get<VolunteerRequest[]>(`/v1/admin/customers/${customerId}/requests`),
  /** spec usability-r2 S1: volunteer requests of every team (oldest first). */
  allVolunteerRequests: (f: { state?: string; customer?: string } = {}) => http.get<TeamVolunteerRequest[]>(`/v1/admin/volunteer-requests${qs(f)}`),
  /** spec usability-r2 S2: a team as its admin (used as the active membership). */
  teamAsAdmin: (customerId: string) => http.get<MembershipInfo>(`/v1/admin/customers/${customerId}/as-admin`),
  approveVolunteer: (customerId: string, membershipId: string, booths: number[]) => http.post(`/v1/admin/customers/${customerId}/requests/${membershipId}/approve`, { booths }),
  rejectVolunteer: (customerId: string, membershipId: string, reason: string) => http.post(`/v1/admin/customers/${customerId}/requests/${membershipId}/reject`, { reason }),
  setUserMobile: (userId: string, mobile: string | null, reason: string) => http.patch(`/v1/admin/users/${userId}/mobile`, { mobile, reason }),
};

export const authApi = {
  requestOtp: (mobile: string) => http.open<{ sent: boolean; devCode?: string }>('/v1/auth/otp/request', { mobile }),
  verifyOtp: (mobile: string, code: string) => http.open<{ accessToken: string; refreshToken: string; deletionCancelled?: boolean }>('/v1/auth/otp/verify', { mobile, code }),
  /** Account deletion (spec account-deletion): code to the account's own mobile, then the request. */
  deleteCode: () => http.post<{ sent: boolean; devCode?: string }>('/v1/me/delete/code'),
  deleteAccount: (code: string) => http.post<{ ok: boolean; dueAt: string }>('/v1/me/delete', { confirm: 'DELETE', code }),
  me: () => http.get<MeInfo>('/v1/me'),
  firebase: (idToken: string) => http.open<{ accessToken: string; refreshToken: string; deletionCancelled?: boolean }>('/v1/auth/firebase', { idToken }),
  logout: (refreshToken: string) => http.open('/v1/auth/logout', { refreshToken }),
  checkCode: (code: string) => http.post<{ partyName: string; stateCode?: string; acNo: number; acName: string; booths: { no: number; name: string; village: string }[] }>('/v1/join/check', { code }),
  join: (code: string, name: string, booths: number[]) => http.post<{ status: string }>('/v1/join', { code, name, booths }),
  /** spec accounts-access */
  profile: (p: { name: string; mobile: string; lang?: string }) => http.patch<{ ok: boolean }>('/v1/me/profile', p),
  accessRequest: (p: AccessRequestInput) => http.post<{ id: string }>('/v1/access-requests', p),
  withdrawRequest: (id: string) => http.del(`/v1/access-requests/${id}`),
  states: () => http.get<{ code: string; name: string; nameLocal?: string | null }[]>('/v1/catalog/states'),
  acs: (state: string) => http.get<{ acNo: number; name: string; nameLocal?: string | null }[]>(`/v1/catalog/acs${qs({ state })}`),
  /** spec party-states A2: national parties + the parties of the state. */
  parties: (state: string) => http.get<{ id: string; name: string }[]>(`/v1/catalog/parties?state=${encodeURIComponent(state)}`),
  overview: () => http.get<{ rows: OverviewRow[] }>('/v1/me/overview'),
  deleteWithToken: (idToken: string) => http.post<{ ok: boolean; dueAt: string }>('/v1/me/delete', { confirm: 'DELETE', idToken }),
};

export interface AccessRequestInput {
  partyId?: string; partyName: string; stateCode: string; wholeState?: boolean; acNos?: number[]; designation: string; note?: string;
}
export interface AccessRequestRow {
  id: string; userId: string; name: string; mobile: string | null; email: string | null; partyId: string | null; partyName: string;
  stateCode: string; wholeState: boolean; acNos: number[]; designation: string; note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'; reason: string | null; createdAt: string; decidedAt: string | null;
}
export interface OverviewRow {
  membershipId: string; partyName: string; stateCode: string; acNo: number; acName: string; volunteers: number; pending: number; contactedPct: number; active?: boolean;
}
export interface AdminAccess {
  states: { partyId: string; partyName: string; stateCode: string; since: string }[];
  assemblies: { membershipId: string; partyId: string; partyName: string; stateCode: string; acNo: number; acName: string; source: 'direct' | 'state' }[];
}
export interface TeamVolunteerRequest extends VolunteerRequest { customerId: string; partyName: string; appName: string | null; stateCode: string; acNo: number; acName: string }
export interface VolunteerRequest { membershipId: string; userId: string; name: string; mobile: string | null; email: string | null; requestedAt: string; booths: number[] }
