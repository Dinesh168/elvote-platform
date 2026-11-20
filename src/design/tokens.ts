/**
 * Design tokens: "Clear" iOS-style theme. Source of truth: docs/DESIGN_SYSTEM.md §3.
 * Screens must use these, never raw colour values (enforced by tokens.test.ts).
 */
import type { GroupCode } from '@/api/types';

export const colors = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#6C6C70',
  textTertiary: '#8E8E93',
  textOnAccent: '#FFFFFF',
  separator: 'rgba(60,60,67,0.18)',
  fill: 'rgba(118,118,128,0.12)',
  pressed: '#E5E5EA',
  chevron: '#C4C4C7',
  accent: '#4F46E5',
  accentTint: 'rgba(79,70,229,0.10)',
  accentSoft: '#EEF0FF',
  accentStrong: '#3730A3',
  success: '#1B7F3B',
  /** Green text on successTint (chips): 5.7:1 on the tint over the page background. */
  successText: '#14662F',
  successFill: '#34C759',
  successTint: 'rgba(52,199,89,0.14)',
  danger: '#D70015',
  dangerFill: '#FF3B30',
  dangerTint: 'rgba(255,59,48,0.12)',
  warning: '#B45309',
  warningFill: '#FF9500',
  overlay: 'rgba(0,0,0,0.32)',
  toast: 'rgba(28,28,30,0.94)',
  toastAction: '#A5B4FC',
  toastSuccess: '#30D158',
  grabber: '#C7C7CC',
  tabBar: 'rgba(249,249,251,0.94)',
  keypadBg: '#D1D4DB',
  keypadKey: '#FFFFFF',
  keypadFn: '#ABB0BA',
  keypadDisabled: '#A9ADB6',
  ringTrack: '#E5E5EA',
  notMetDot: '#C7C7CC',
  iconMobile: '#34C759',
  iconHouse: '#FF9500',
  iconAge: '#007AFF',
  iconGender: '#AF52DE',
  iconTask: '#FF9500',
  deviceFrame: '#1C1C1E',
} as const;

export type GroupTone = { strong: string; tint: string };

export const group: Record<GroupCode, GroupTone> & { none: GroupTone } = {
  our: { strong: '#1B7F3B', tint: '#F0FAF2' },
  target: { strong: '#B45309', tint: '#FFF8EB' },
  opp: { strong: '#D70015', tint: '#FFF0F1' },
  none: { strong: '#6C6C70', tint: '#FFFFFF' }, // "Not met" text: 5.1:1 on white (was 3.3:1)
};

/**
 * Chart mark colours (validated with the dataviz palette checker: CVD + normal-vision separation pass).
 * Target uses a yellower amber than the text token so it stays distinct from Opposition for colour-blind
 * readers. Marks only; every chart also shows text labels and numbers. Text keeps the `group` tokens.
 */
export const chart = {
  our: '#1B7F3B',
  target: '#CA8A04',
  opp: '#D70015',
  none: '#D1D1D6',
  series: '#4F46E5',
  track: '#EEEEF3',
  /** Sequential steps (one hue, light → dark) for magnitude, e.g. % contacted on the map. */
  seq: ['#C7C4F7', '#8C85EE', '#4F46E5'],
} as const;

/** Quick party-colour choices for the super-admin (any #RRGGBB can also be typed). */
export const brandSwatches = ['#15803D', '#0E7490', '#1D4ED8', '#7C3AED', '#BE123C', '#C2410C', '#B45309', '#0F172A'] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 7, md: 10, lg: 12, full: 999 } as const;

export const hairline = 0.5;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  paRegular: 'NotoSansGurmukhi_400Regular',
  paSemibold: 'NotoSansGurmukhi_600SemiBold',
  paBold: 'NotoSansGurmukhi_700Bold',
  hiRegular: 'NotoSansDevanagari_400Regular',
  hiSemibold: 'NotoSansDevanagari_600SemiBold',
  hiBold: 'NotoSansDevanagari_700Bold',
} as const;

export const type = {
  largeTitle: { fontSize: 32, lineHeight: 40, fontFamily: fonts.bold, letterSpacing: -0.5 },
  title2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold },
  headline: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 17, lineHeight: 22, fontFamily: fonts.regular },
  callout: { fontSize: 15, lineHeight: 20, fontFamily: fonts.regular },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
} as const;

/** Web desktop scale (spec web-desktop W4): denser than the phone scale, still ≥ 12 px. */
export const typeWeb = {
  largeTitle: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.4 },
  title2: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  headline: { fontSize: 15, lineHeight: 20, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  callout: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
} as const;

/** Web desktop chrome. */
export const web = {
  sidebar: 240,
  rail: 72,
  topBar: 64,
  contentMax: 1200,
  gutter: 32,
  border: '#E3E3E8',
  hover: '#F5F5F9',
  sidebarBg: '#FBFBFD',
  navActive: 'rgba(79,70,229,0.10)',
  focus: '#4F46E5',
  buttonHover: '#4338CA',
} as const;

export const touch ={ min: 44, primary: 50, group: 56, row: 52 } as const;

export const motion = { press: 120, enter: 220 } as const;
