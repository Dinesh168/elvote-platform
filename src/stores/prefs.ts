import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '@/i18n';

/** Per-device preferences: language, selected booth, picked task. */
interface PrefsState {
  lang: Lang;
  booth: number;
  pickedTaskId: string | null;
  hydrated: boolean;
  /** True once the person picked a language themselves; then a customer's default no longer overrides it. */
  langChosen: boolean;
  /** First launch (welcome + choose language) finished on this device (spec onboarding-branding OB1). */
  onboarded: boolean;
  /** Picture tips on Home were shown (spec map-trend G3). */
  tipsSeen: boolean;
  /** spec states-keyboard A2: last state picked in a state dropdown. */
  lastState: string | null;
  pickState: (code: string) => void;
  seeTips: () => void;
  setLang: (l: Lang) => void;
  finishOnboarding: (l: Lang) => void;
  applyDefaultLang: (l: Lang) => void;
  setBooth: (b: number) => void;
  pickTask: (id: string | null) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      lang: 'pa',
      booth: 112,
      pickedTaskId: null,
      hydrated: false,
      langChosen: false,
      onboarded: false,
      tipsSeen: false,
      lastState: null,
      pickState: (lastState) => set({ lastState }),
      seeTips: () => set({ tipsSeen: true }),
      setLang: (lang) => set({ lang, langChosen: true }),
      finishOnboarding: (lang) => set({ lang, langChosen: true, onboarded: true }),
      applyDefaultLang: (lang) => set({ lang }),
      setBooth: (booth) => set({ booth }),
      pickTask: (pickedTaskId) => set({ pickedTaskId }),
    }),
    {
      name: 'elvote.prefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lang: s.lang, langChosen: s.langChosen, onboarded: s.onboarded, tipsSeen: s.tipsSeen, lastState: s.lastState, booth: s.booth, pickedTaskId: s.pickedTaskId }),
      onRehydrateStorage: () => () => usePrefs.setState({ hydrated: true }),
    },
  ),
);
