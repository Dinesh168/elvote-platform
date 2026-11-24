import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { colors } from '@/design/tokens';
import { mapHtml, type MapMsgIn, type MapMsgOut } from './mapHtml';

export interface MapHandle { post: (m: MapMsgIn) => void }

/** spec booth-map M1 (web): the same Leaflet map page in an iframe; messages over postMessage. */
export const MapView = forwardRef<MapHandle, { onMessage: (m: MapMsgOut) => void }>(function MapView({ onMessage }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => mapHtml({ bridge: 'parent', accent: colors.accent, fitLabel: '' }), []);
  const cb = useRef(onMessage);
  useEffect(() => { cb.current = onMessage; }, [onMessage]);
  useImperativeHandle(ref, () => ({ post: (m) => frame.current?.contentWindow?.postMessage(JSON.stringify(m), '*') }), []);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        const m = JSON.parse(e.data) as MapMsgOut & { __elvoteMap?: number };
        if (m.__elvoteMap) cb.current(m);
      } catch { /* not ours */ }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  return createElement('iframe', {
    ref: frame, srcDoc: html, title: 'Map', style: { border: 0, width: '100%', height: '100%', flex: 1, display: 'block', background: colors.bg },
  });
});
