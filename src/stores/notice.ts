import { create } from 'zustand';

/** One app-wide message shown as a toast (e.g. after account deletion or its undo). */
export const useNotice = create<{ text: string | null; show: (t: string) => void; clear: () => void }>()((set) => ({
  text: null,
  show: (text) => set({ text }),
  clear: () => set({ text: null }),
}));
