import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DoneBarHost } from '@/design/components/DoneBar';
import { NotoSansGurmukhi_400Regular, NotoSansGurmukhi_600SemiBold, NotoSansGurmukhi_700Bold } from '@expo-google-fonts/noto-sans-gurmukhi';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSubscribe } from '@tanstack/react-query-persist-client';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, web } from '@/design/tokens';
import { persistOptions, queryClient } from '@/features/data';
import { initI18n } from '@/i18n';
import { Toast } from '@/design/components';
import { useNotice } from '@/stores/notice';
import { usePrefs } from '@/stores/prefs';
// Defines the polling-day background location task at start-up (the phone may wake the app just for it).
import '@/features/pollingDay/tracker';
import { listenPushTaps } from '@/features/pollingDay/push';
import { goLanding } from '@/features/session/session';
import { useTrackHistory } from '@/features/shell/navHistory';
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold, NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari';

void SplashScreen.preventAutoHideAsync();

/** W4: web-only global CSS: visible keyboard focus, pointer cursor, no tap flash. Native is untouched. */
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('elvote-web-css')) {
  const el = document.createElement('style');
  el.id = 'elvote-web-css';
  el.textContent = [
    `:focus { outline: none; }`,
    `:focus-visible { outline: 2px solid ${web.focus} !important; outline-offset: 2px; }`,
    `[role="button"], [role="link"], [role="radio"], [role="tab"], [role="row"][tabindex], a { cursor: pointer; }`,
    `[aria-disabled="true"] { cursor: default; }`,
    `body { -webkit-tap-highlight-color: transparent; }`,
  ].join('\n');
  document.head.appendChild(el);
  // Brand icons + web app manifest (logo kit): installable website, home-screen icon, browser theme colour.
  const head = (tag: string, attrs: Record<string, string>) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    document.head.appendChild(n);
  };
  head('link', { rel: 'manifest', href: '/site.webmanifest' });
  head('link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' });
  head('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  head('meta', { name: 'theme-color', content: colors.accent });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    NotoSansGurmukhi_400Regular, NotoSansGurmukhi_600SemiBold, NotoSansGurmukhi_700Bold,
    NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold, NotoSansDevanagari_700Bold,
  });
  // spec nav-back B1–B3: Back (on screen and Android) returns to the screen you came from, across tabs too.
  useTrackHistory();
  const hydrated = usePrefs((s) => s.hydrated);
  const lang = usePrefs((s) => s.lang);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    void initI18n(lang).then(() => setI18nReady(true));
  }, [hydrated, lang]);

  // Spec sync-modes S1: load the device copy of the data BEFORE any screen asks for data, then keep saving it.
  // (If screens start first, their empty requests win over the restored data and get saved over it.)
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    void persistQueryClientRestore({ queryClient, ...persistOptions })
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return;
        unsub = persistQueryClientSubscribe({ queryClient, ...persistOptions });
        setRestored(true);
      });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  // spec accounts-access AC11: a tapped notification opens its page (approval → the app's start page).
  useEffect(() => listenPushTaps((url) => (url === '/' || url === '/waiting' ? void goLanding().catch(() => undefined) : router.push(url as never))), []);

  const ready = fontsLoaded && i18nReady && restored;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
          <NoticeHost />
          <DoneBarHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function NoticeHost() {
  const text = useNotice((s) => s.text);
  const clear = useNotice((s) => s.clear);
  return <Toast message={text} onHide={clear} />;
}
