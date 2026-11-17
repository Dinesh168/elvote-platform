import { Platform } from 'react-native';

export const THEME = {
  COLOR: {
    // Primary — Brand Blue
    PRIMARY: 'rgba(24, 76, 161, 1)',
    PRIMARY_DARK: 'rgba(14, 50, 110, 1)',
    PRIMARY_LIGHT: 'rgba(60, 110, 200, 1)',
    PRIMARY_FOREGROUND: 'rgba(255,255,255,1)',
    PRIMARY_BACKGROUND: 'rgba(236, 243, 255, 1)',
    SECONDARY_BACKGROUND: 'rgba(236, 243, 255, 1)',

    // Accent — Brand Red
    ACCENT: 'rgba(210, 43, 43, 1)',
    ACCENT_DARK: 'rgba(165, 29, 29, 1)',
    ACCENT_LIGHT: 'rgba(240, 80, 80, 1)',
    ACCENT_FOREGROUND: 'rgba(255,255,255,1)',
    ACCENT_BACKGROUND: 'rgba(255, 237, 237, 1)',

    // Semantic
    SUCCESS: '#0EA748',
    SUCCESS_LIGHT: '#34D058',
    SUCCESS_BACKGROUND: '#E6F9ED',
    DANGER: '#DC3545',
    DANGER_LIGHT: '#F06070',
    DANGER_BACKGROUND: '#FDECEE',
    NEUTRAL: 'rgba(24, 76, 161, 1)',
    NEUTRAL_BACKGROUND: 'rgba(236, 243, 255, 1)',
    WARNING: '#F59E0B',
    WARNING_LIGHT: '#FBBF24',
    WARNING_BACKGROUND: '#FFF8E6',
    INFO: '#3B82F6',
    INFO_BACKGROUND: '#EFF6FF',

    // Brand third-party
    WHATSAPP: '#075E54',
    WHATSAPP_BACKGROUND: '#E8F5E9',
    CALL_COLOR: '#64A639',

    // Surface & Text
    SURFACE: '#FFFFFF',
    SURFACE_ELEVATED: '#F8FAFF',
    BACKGROUND: '#F0F2F8',
    TEXT_PRIMARY: '#111827',
    TEXT_SECONDARY: '#4B5563',
    TEXT_MUTED: '#9CA3AF',
    TEXT_INVERSE: '#FFFFFF',
    BORDER: '#E5E7EB',
    BORDER_LIGHT: '#F3F4F6',
    DIVIDER: '#E5E7EB',

    // Gradient stops
    GRADIENT_PRIMARY_START: '#1E56B0',
    GRADIENT_PRIMARY_END: '#0D2D66',
    GRADIENT_ACCENT_START: '#D22B2B',
    GRADIENT_ACCENT_END: '#A51D1D',
    GRADIENT_MIXED_START: '#184CA1',
    GRADIENT_MIXED_END: '#D22B2B',
    GRADIENT_SURFACE_START: '#FFFFFF',
    GRADIENT_SURFACE_END: '#F8FAFF',

    // Overlay & Backdrop
    OVERLAY: 'rgba(0, 0, 0, 0.5)',
    BACKDROP: 'rgba(17, 24, 39, 0.25)',
    SHIMMER_BASE: '#E5E7EB',
    SHIMMER_HIGHLIGHT: '#F3F4F6',
  },

  OPACITY: {
    DISABLED: 0.4,
    PRESSED: 0.85,
    HOVER: 0.95,
    OVERLAY: 0.5,
    MUTED: 0.6,
  },

  SPACING: {
    XXS: 2,
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 24,
    XXL: 32,
    XXXL: 48,
    XXXXL: 64,
  },

  FONT_SIZE: {
    XXS: 10,
    XS: 11,
    SM: 13,
    MD: 15,
    LG: 17,
    XL: 20,
    XXL: 24,
    XXXL: 30,
    DISPLAY: 36,
    DISPLAY_LG: 44,
  },

  LINE_HEIGHT: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.75,
  },

  FONT_WEIGHT: {
    REGULAR: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
    EXTRABOLD: '800',
  },

  BORDER_RADIUS: {
    XS: 4,
    SM: 6,
    MD: 10,
    LG: 14,
    XL: 20,
    XXL: 28,
    FULL: 999,
  },

  ICON_SIZE: {
    XS: 14,
    SM: 18,
    MD: 22,
    LG: 28,
    XL: 36,
    XXL: 48,
  },

  CARD: {
    PADDING: 16,
    PADDING_LG: 20,
    PADDING_XL: 24,
    BORDER_RADIUS: 14,
    ACCENT_BAR_HEIGHT: 3,
  },

  ANIMATION: {
    FAST: 150,
    NORMAL: 250,
    SLOW: 400,
    SPRING: { damping: 15, stiffness: 150 },
  },

  SHADOW: {
    NONE: Platform.select({
      ios: {},
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
      default: { elevation: 0 },
    }),
    LIGHT: Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' },
      default: { elevation: 1 },
    }),
    MEDIUM: Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 14px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)' },
      default: { elevation: 3 },
    }),
    HEAVY: Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 6 },
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)' },
      default: { elevation: 6 },
    }),
    COLORED: (color) => Platform.select({
      ios: { shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: `0 4px 14px ${color}33, 0 2px 6px ${color}1A` },
      default: { elevation: 4 },
    }),
  },

  BREAKPOINT: {
    MOBILE: 0,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1440,
  },
}
