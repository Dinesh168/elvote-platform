/**
 * Durable on-device storage (spec sync-modes S1). AsyncStorage-compatible API.
 * - Android/iOS: SQLite (expo-sqlite/kv-store) — survives restarts, large capacity, no 6 MB AsyncStorage cap.
 * - Web: IndexedDB (idb-keyval), falling back to localStorage when IndexedDB is unavailable.
 * - Jest: AsyncStorage mock.
 * Reading a key that is not here yet also checks the old AsyncStorage location and moves it over,
 * so unsent changes from an older app version are never lost.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface KV {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const isJest = typeof process !== 'undefined' && !!process.env.JEST_WORKER_ID;

function nativeKV(): KV {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Storage = require('expo-sqlite/kv-store').default as KV;
  return Storage;
}

function webKV(): KV {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const idb = require('idb-keyval') as { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<void>; del: (k: string) => Promise<void> };
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
    return {
      getItem: async (k) => ((await idb.get(k)) as string | undefined) ?? null,
      setItem: (k, v) => idb.set(k, v),
      removeItem: (k) => idb.del(k),
    };
  } catch {
    return {
      getItem: async (k) => globalThis.localStorage?.getItem(k) ?? null,
      setItem: async (k, v) => globalThis.localStorage?.setItem(k, v),
      removeItem: async (k) => globalThis.localStorage?.removeItem(k),
    };
  }
}

let backing: KV | null = null;
const store = (): KV => {
  if (backing) return backing;
  backing = isJest ? (AsyncStorage as unknown as KV) : Platform.OS === 'web' ? webKV() : nativeKV();
  return backing;
};

export const durable: KV = {
  async getItem(key) {
    const v = await store().getItem(key);
    if (v != null || isJest) return v;
    // One-time move from the old AsyncStorage location (older app versions).
    const old = await AsyncStorage.getItem(key).catch(() => null);
    if (old != null) {
      await store().setItem(key, old);
      await AsyncStorage.removeItem(key).catch(() => undefined);
    }
    return old;
  },
  setItem: (key, value) => store().setItem(key, value),
  removeItem: (key) => store().removeItem(key),
};
