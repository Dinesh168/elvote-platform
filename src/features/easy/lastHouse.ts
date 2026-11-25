import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** spec easy-redesign V2: "Open last house: N" on Home after an interruption (per booth, kept on the device). */
export const useLastHouse = create<{ byBooth: Record<number, string>; set: (booth: number, house: string) => void }>()(
  persist((set) => ({ byBooth: {}, set: (booth, house) => set((s) => ({ byBooth: { ...s.byBooth, [booth]: house } })) }), {
    name: 'elvote.lastHouse.v1',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);
