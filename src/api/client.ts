import { httpApi } from './httpApi';
import { mockApi } from './mock/mockApi';
import type { Api } from './types';

/**
 * The one place that decides which API implementation the app uses.
 * Default: the real backend (backend-v2). `EXPO_PUBLIC_API_MODE=mock` runs on in-memory sample data
 * (used by unit tests and for UI work without a server).
 */
export const API_MODE: 'http' | 'mock' = process.env.EXPO_PUBLIC_API_MODE === 'mock' ? 'mock' : 'http';

export const api: Api = API_MODE === 'mock' ? mockApi : httpApi;
