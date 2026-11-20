import { Platform, useWindowDimensions } from 'react-native';

/** W1: layout class. Native is always `phone`; web switches by window width (spec web-desktop WD2). */
export type LayoutKind = 'phone' | 'rail' | 'desktop';

export const BREAKPOINTS = { rail: 768, desktop: 1024 } as const;

export function layoutFor(os: string, width: number): LayoutKind {
  if (os !== 'web') return 'phone';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.rail) return 'rail';
  return 'phone';
}

export function useLayout(): LayoutKind {
  const { width } = useWindowDimensions();
  return layoutFor(Platform.OS, width);
}

/** True when the web desktop frame (sidebar, page header, tables) is in use. */
export const useWide = () => useLayout() !== 'phone';
