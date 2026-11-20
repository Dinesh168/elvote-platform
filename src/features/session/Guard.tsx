import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { API_MODE } from '@/api/client';
import { useSession, type Mode } from '@/stores/session';

/** Sends the user back to the start screen when the session is missing or in another role (e.g. after a web reload). */
export function useGuard(mode: Mode) {
  const me = useSession((s) => s.me);
  const current = useSession((s) => s.mode);
  const path = usePathname();
  const params = useGlobalSearchParams();
  if (API_MODE === 'mock') return null;
  if (!me || current !== mode) {
    // Keep the query too (e.g. /admin/booth?no=112), so a reloaded page opens the same thing.
    const q = Object.entries(params).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`).join('&');
    return <Redirect href={{ pathname: '/', params: { next: q ? `${path}?${q}` : path } }} />;
  }
  return null;
}
