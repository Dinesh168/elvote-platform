import { API_URL } from '@/api/http';
import { useActiveMembership, type CustomerLook, type FeatureKey } from '@/stores/session';
import { isLang, type Lang } from '@/i18n';

/** C3: is a feature on for the open customer? (Super-admin and mock mode: always on.) */
export function useFeature(key: FeatureKey): boolean {
  const m = useActiveMembership();
  return m?.features?.[key] !== false;
}

/** C1/C2/C6: the open customer's look and candidate details. */
export function useLook(): CustomerLook | null {
  return useActiveMembership()?.look ?? null;
}

/** C4: languages this team may switch between (all when not set). */
export function useAllowedLangs(): Lang[] {
  const langs = (useLook()?.languages ?? ['pa', 'hi', 'en']).filter(isLang);
  return langs.length ? langs : ['pa', 'hi', 'en'];
}

/** Server file paths (/files/…) → full URL. */
export const fileUrl = (u: string | null | undefined) => (!u ? null : /^https?:/.test(u) ? u : `${API_URL}${u}`);
