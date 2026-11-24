/**
 * Signed-in session. The refresh token is kept in the device keychain (SecureStore) on Android/iOS,
 * and in browser storage on web (local testing). The access token lives only in memory.
 */
import { durable } from '@/lib/durable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

const REFRESH_KEY = 'elvote.refresh.v1';
const ACTIVE_KEY = 'elvote.active.v1';

const ME_KEY = 'elvote.me.v1';

export type Mode = 'volunteer' | 'admin' | 'platform';

export interface MembershipInfo {
  id: string;
  role: 'admin' | 'volunteer';
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  partyId: string;
  partyName: string;
  partyAcId: string;
  stateCode: string;
  acNo: number;
  acName: string;
  booths: number[];
  maxZones: number;
  zoneCount: number;
  /** Customer settings set by the super-admin (spec customer-cms). Optional for older servers / mock mode. */
  active?: boolean;
  features?: Partial<Record<FeatureKey, boolean>>;
  look?: CustomerLook;
  /** Sync mode set by the super-admin (spec sync-modes). */
  sync?: { mode: 'live' | 'offline' | 'scheduled'; minutes: number };
  /** Polling day for this team's assembly, if one is set (spec polling-day S1); remembered offline. */
  pollingDay?: { electionId: string; name: string; date: string; opensAt: string; closesAt: string; radiusM: number } | null;
  boothRadiusM?: number;
  /** spec admin-views G2: levels the admin may view by (super-admin setting). */
  views?: ('zone' | 'area' | 'village')[];
  resultMargin?: number;
  /** Super-admin working inside this team as its admin (spec usability-r2 S2); id = team id. */
  asSuperAdmin?: boolean;
  /** Regional language of this assembly's data (spec bilingual-roll L1). */
  dataLang?: 'hi' | 'pa';
}

export type FeatureKey = 'map' | 'poll' | 'zones' | 'tasks' | 'slip' | 'surnames' | 'help' | 'boothGps';
export interface CustomerLook {
  appName: string | null; logoUrl: string | null; bannerUrl?: string | null; colour: string | null;
  candidateName: string | null; candidatePhotoUrl: string | null; ballotNo: number | null; slogan: string | null;
  message: string | null; slipShareText: string | null; defaultLang: string | null; languages: string[];
}

/** An admin request (spec accounts-access AC6). */
export interface AccessRequestInfo {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  partyName: string;
  stateCode: string;
  wholeState: boolean;
  acNos: number[];
  designation: string;
  reason: string | null;
}

export interface MeInfo {
  /** mobile is null until "Your details" (spec accounts-access AC4). */
  user: { id: string; mobile: string | null; email?: string | null; name: string; lang: string; profileDone?: boolean };
  isSuperAdmin: boolean;
  memberships: MembershipInfo[];
  accessRequest?: AccessRequestInfo | null;
}

const store = {
  async get(k: string) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(k);
    return SecureStore.getItemAsync(k);
  },
  async set(k: string, v: string | null) {
    if (Platform.OS === 'web') return v == null ? AsyncStorage.removeItem(k) : AsyncStorage.setItem(k, v);
    return v == null ? SecureStore.deleteItemAsync(k) : SecureStore.setItemAsync(k, v);
  },
};

interface SessionState {
  loaded: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  me: MeInfo | null;
  mode: Mode | null;
  membershipId: string | null;
  /** spec usability-r2 S2: team opened by the super-admin as its admin (memory only: a reload returns to Overview). */
  asTeam: MembershipInfo | null;
  setAsTeam: (m: MembershipInfo | null) => void;
  load: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setAccess: (access: string) => void;
  setMe: (me: MeInfo) => void;
  activate: (mode: Mode, membershipId: string | null) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>()((set) => ({
  loaded: false,
  accessToken: null,
  refreshToken: null,
  me: null,
  mode: null,
  membershipId: null,
  asTeam: null,
  setAsTeam: (asTeam) => set({ asTeam }),
  load: async () => {
    const [refresh, active, cached] = await Promise.all([store.get(REFRESH_KEY), AsyncStorage.getItem(ACTIVE_KEY), durable.getItem(ME_KEY).catch(() => null)]);
    const a = active ? (JSON.parse(active) as { mode: Mode; membershipId: string | null }) : null;
    // The last known profile lets the app open without internet (spec sync-modes S1).
    const me = refresh && cached ? (JSON.parse(cached) as MeInfo) : null;
    set({ loaded: true, refreshToken: refresh, me, mode: a?.mode ?? null, membershipId: a?.membershipId ?? null });
  },
  setTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    await store.set(REFRESH_KEY, refreshToken);
  },
  setAccess: (accessToken) => set({ accessToken }),
  setMe: (me) => {
    set({ me });
    void durable.setItem(ME_KEY, JSON.stringify(me)).catch(() => undefined);
  },
  activate: async (mode, membershipId) => {
    set({ mode, membershipId });
    await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify({ mode, membershipId }));
  },
  signOut: async () => {
    set({ accessToken: null, refreshToken: null, me: null, mode: null, membershipId: null, asTeam: null });
    await Promise.all([store.set(REFRESH_KEY, null), AsyncStorage.removeItem(ACTIVE_KEY), durable.removeItem(ME_KEY).catch(() => undefined)]);
  },
}));

/** The membership the app is currently working in. */
export function activeMembership(): MembershipInfo | null {
  const { me, membershipId, asTeam } = useSession.getState();
  if (asTeam && asTeam.id === membershipId) return asTeam;
  return me?.memberships.find((m) => m.id === membershipId) ?? null;
}

export function useActiveMembership(): MembershipInfo | null {
  const me = useSession((s) => s.me);
  const id = useSession((s) => s.membershipId);
  const asTeam = useSession((s) => s.asTeam);
  if (asTeam && asTeam.id === id) return asTeam;
  return me?.memberships.find((m) => m.id === id) ?? null;
}
