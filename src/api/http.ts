/**
 * HTTP client for backend v2. Adds the access token, refreshes it once on 401, and turns
 * error responses into ApiError with the server's code and plain-language message.
 */
import { router } from 'expo-router';
import { i18n } from '@/i18n';
import { useNotice } from '@/stores/notice';
import { Platform } from 'react-native';
import { useSession } from '@/stores/session';

const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

type Refresh = 'ok' | 'denied' | 'network';
let refreshing: Promise<Refresh> | null = null;

/** C8: the super-admin blocked this person; say why they were signed out. */
function blockedNotice() {
  useNotice.getState().show(i18n.t('auth.blocked'));
}

/**
 * Gets a new access token. 'network' (no internet / server unreachable) is NOT a sign-out: the person stays
 * signed in and their changes stay queued (spec sync-modes S7). Only a refusal by the server signs out.
 */
async function refreshOnce(): Promise<Refresh> {
  if (refreshing) return refreshing;
  refreshing = (async (): Promise<Refresh> => {
    const rt = useSession.getState().refreshToken;
    if (!rt) return 'denied';
    try {
      const r = await fetch(`${API_URL}/v1/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        if (j?.error === 'user_blocked') blockedNotice();
        return r.status >= 500 ? 'network' : 'denied';
      }
      const j = (await r.json()) as { accessToken: string; refreshToken: string };
      await useSession.getState().setTokens(j.accessToken, j.refreshToken);
      return 'ok';
    } catch {
      return 'network';
    }
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

export async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean; form?: FormData } = {}): Promise<T> {
  const auth = opts.auth !== false;
  const send = async () => {
    const headers: Record<string, string> = {};
    if (!opts.form && body !== undefined) headers['content-type'] = 'application/json';
    const token = useSession.getState().accessToken;
    if (auth && token) headers.authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { method, headers, body: opts.form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  };
  let res: Response;
  try {
    if (auth && !useSession.getState().accessToken) await refreshOnce();
    res = await send();
    if (auth && res.status === 401) {
      const r = await refreshOnce();
      if (r === 'ok') res = await send();
      else if (r === 'network') throw new ApiError(0, 'network', 'No connection to the server.');
      else {
        // Signed out by the server. Unsent changes stay on the device and are sent after the next sign-in.
        await useSession.getState().signOut();
        throw new ApiError(401, 'signed_out', 'Sign in again.');
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'network', 'No connection to the server.');
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  // C5: the customer's subscription ended while the app was open → show the paused page.
  if (res.status === 403 && json?.error === 'subscription_ended') router.replace('/paused');
  // spec easy-redesign O5: the super-admin paused this person in this team.
  if (res.status === 403 && json?.error === 'paused') router.replace({ pathname: '/paused', params: { who: 'me' } });
  if (!res.ok) throw new ApiError(res.status, json?.error ?? 'error', json?.message ?? 'Something went wrong.', json?.details);
  return json as T;
}

export const http = {
  get: <T,>(p: string) => request<T>('GET', p),
  post: <T,>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  put: <T,>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {}),
  patch: <T,>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {}),
  del: <T,>(p: string) => request<T>('DELETE', p),
  form: <T,>(p: string, f: FormData) => request<T>('POST', p, undefined, { form: f }),
  open: <T,>(p: string, b: unknown) => request<T>('POST', p, b, { auth: false }),
};
