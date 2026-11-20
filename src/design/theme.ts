/**
 * Customer look (spec customer-cms C1): the party colour becomes the app's accent after sign-in.
 * Tokens stay the single source: we update the accent-derived token values in place, and style sheets
 * that use them are wrapped with `themed()` so they are rebuilt when the theme changes.
 */
import { create } from 'zustand';
import { chart, colors, web } from './tokens';

const DEFAULT = { accent: '#184BA1' } as const; // ElVote brand blue

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** WCAG contrast ratio of a colour against white. */
export const contrastOnWhite = (h: string) => 1.05 / (lum(hex(h)) + 0.05);
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/**
 * The party colour, darkened (same hue) until it reaches 5.2:1 on white. The extra margin over WCAG's 4.5:1
 * keeps accent text readable on the light accent tints too (selected sidebar item, tinted buttons).
 */
export const MIN_CONTRAST = 5.2;
export function accentFrom(input: string | null | undefined): string {
  if (!input || !/^#[0-9A-Fa-f]{6}$/.test(input)) return DEFAULT.accent;
  let c = hex(input);
  for (let i = 0; i < 40 && contrastOnWhite(toHex(c)) < MIN_CONTRAST; i++) c = mix(c, [0, 0, 0], 0.04);
  return toHex(c);
}

export function paletteFrom(input: string | null | undefined) {
  const accent = accentFrom(input);
  const rgb = hex(accent);
  const [r, g, b] = rgb;
  return {
    accent,
    accentTint: `rgba(${r},${g},${b},0.10)`,
    accentSoft: toHex(mix(rgb, [255, 255, 255], 0.9)),
    accentStrong: toHex(mix(rgb, [0, 0, 0], 0.3)),
    navActive: `rgba(${r},${g},${b},0.10)`,
    buttonHover: toHex(mix(rgb, [0, 0, 0], 0.15)),
    seq: [toHex(mix(rgb, [255, 255, 255], 0.7)), toHex(mix(rgb, [255, 255, 255], 0.4)), accent],
  };
}

/** Bumped whenever the palette changes; `themed()` style sheets and the app shell listen to it. */
export const useThemeVersion = create<{ v: number; colour: string | null }>()(() => ({ v: 0, colour: null }));

export function applyBrand(input: string | null | undefined) {
  const want = input && /^#[0-9A-Fa-f]{6}$/.test(input) ? input.toUpperCase() : null;
  if (useThemeVersion.getState().colour === want && useThemeVersion.getState().v > 0) return;
  const p = paletteFrom(want);
  const c = colors as unknown as Record<string, string>;
  c.accent = p.accent;
  c.accentTint = p.accentTint;
  c.accentSoft = p.accentSoft;
  c.accentStrong = p.accentStrong;
  const w = web as unknown as Record<string, string>;
  w.navActive = p.navActive;
  w.focus = p.accent;
  w.buttonHover = p.buttonHover;
  const ch = chart as unknown as { series: string; seq: string[] };
  ch.series = p.accent;
  ch.seq = p.seq;
  useThemeVersion.setState((s) => ({ v: s.v + 1, colour: want }));
}

/**
 * A style sheet that is rebuilt after the theme changes (for styles that use accent-derived tokens).
 * Usage: `const s = themed(() => StyleSheet.create({ ... }))` — then use `s.x` as before.
 */
export function themed<T extends object>(build: () => T): T {
  let built = build();
  let at = useThemeVersion.getState().v;
  return new Proxy({} as T, {
    get(_t, key) {
      const v = useThemeVersion.getState().v;
      if (v !== at) { built = build(); at = v; }
      return (built as Record<string | symbol, unknown>)[key];
    },
  });
}
