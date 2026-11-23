import { usePrefs } from '@/stores/prefs';

/** spec states-keyboard A2: the state to show: the last one picked on this device if offered, else the first offered. */
export function useStateChoice(codes: string[]): [string, (code: string) => void] {
  const last = usePrefs((s) => s.lastState);
  const pick = usePrefs((s) => s.pickState);
  const state = last && codes.includes(last) ? last : codes[0] ?? last ?? 'PB';
  return [state, pick];
}
