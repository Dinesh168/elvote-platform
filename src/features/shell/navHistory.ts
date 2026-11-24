import { router, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * spec nav-back B1–B3: Back returns to the screen you came from, also across tabs (Map → booth page → Back = Map).
 * Each tab keeps its own page stack, so router.back() alone would pop the other tab's stack and land on its first page.
 * We remember the visited screens with their tab; Back goes to the previous one. Android's hardware Back does the same.
 */
type Entry = { path: string; params: Record<string, string>; tab: string };
const history: Entry[] = [];
const MAX = 40;

/** The tab (route group) a screen lives in, e.g. ['admin','(dashboard)','booth'] → 'admin/(dashboard)'. */
const tabOf = (segments: string[]) => {
  const i = segments.findIndex((x) => x.startsWith('('));
  return i >= 0 ? segments.slice(0, i + 1).join('/') : segments.join('/');
};

export function useTrackHistory() {
  const path = usePathname();
  const segments = useSegments() as string[];
  const params = useGlobalSearchParams() as Record<string, string>;
  useEffect(() => {
    const e: Entry = { path, params: { ...params }, tab: tabOf(segments) };
    const last = history.at(-1);
    if (last && last.path === path) { history[history.length - 1] = e; return; }
    const prev = history.at(-2);
    if (prev && prev.path === path) history.pop(); // we came back
    else history.push(e);
    if (history.length > MAX) history.splice(0, history.length - MAX);
  }, [path, segments, params]);

  // Android hardware Back: same rule as the on-screen Back (sheets / dialogs handle their own back first).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.length < 2) return false; // first screen: let Android close the app
      goBack();
      return true;
    });
    return () => sub.remove();
  }, []);
}

/** True when Back will leave this tab (the on-screen label then says just "Back"). */
export const backLeavesTab = () => {
  const cur = history.at(-1);
  const prev = history.at(-2);
  return !!cur && !!prev && cur.tab !== prev.tab;
};

export function goBack() {
  const cur = history.at(-1);
  const prev = history.at(-2);
  if (!prev || !cur) {
    if (router.canGoBack()) router.back();
    else router.replace('/');
    return;
  }
  if (prev.tab === cur.tab) {
    if (router.canGoBack()) router.back();
    else router.navigate({ pathname: prev.path as never, params: prev.params });
    return;
  }
  // Other tab: leave this tab's stack clean, then return to where the person came from.
  history.pop();
  if (router.canDismiss()) router.dismiss();
  router.navigate({ pathname: prev.path as never, params: prev.params });
}

/** Test hook. */
export const _history = history;
