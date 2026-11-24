import { forwardRef, useImperativeHandle, useMemo, useRef, type ComponentType, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import { colors } from '@/design/tokens';
import { mapHtml, type MapMsgIn, type MapMsgOut } from './mapHtml';

// react-native-webview 14's class typings resolve to `never` with React 19 types; type the props we use.
type WebViewRef = { postMessage: (data: string) => void };
type WebViewProps = {
  ref?: Ref<WebViewRef>; source: { html: string; baseUrl?: string }; originWhitelist?: string[]; style?: object; javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean; cacheEnabled?: boolean; setBuiltInZoomControls?: boolean; overScrollMode?: string; bounces?: boolean;
  onMessage?: (e: { nativeEvent: { data: string } }) => void;
};
const WebView = RNWebView as unknown as ComponentType<WebViewProps>;

export interface MapHandle { post: (m: MapMsgIn) => void }

/** spec booth-map M1: the Leaflet map page in a WebView (works in Expo Go, the APK and iOS without a native map SDK). */
export const MapView = forwardRef<MapHandle, { onMessage: (m: MapMsgOut) => void }>(function MapView({ onMessage }, ref) {
  const web = useRef<WebViewRef>(null);
  const html = useMemo(() => mapHtml({ bridge: 'rn', accent: colors.accent, fitLabel: '' }), []);
  useImperativeHandle(ref, () => ({ post: (m) => web.current?.postMessage(JSON.stringify(m)) }), []);
  return (
    <WebView
      ref={web}
      source={{ html, baseUrl: 'https://elvote.local/' }}
      originWhitelist={['*']}
      style={s.map}
      javaScriptEnabled
      domStorageEnabled
      cacheEnabled
      setBuiltInZoomControls={false}
      overScrollMode="never"
      bounces={false}
      onMessage={(e) => {
        try { onMessage(JSON.parse(e.nativeEvent.data) as MapMsgOut); } catch { /* not ours */ }
      }}
    />
  );
});

const s = StyleSheet.create({ map: { flex: 1, backgroundColor: colors.bg } });
