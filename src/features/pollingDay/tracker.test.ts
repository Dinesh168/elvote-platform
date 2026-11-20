/** TC-PD-U-4 (docs/test-cases/polling-day.md): readings queue on the phone, keep what changed, and go out in order when online. */
import { ApiError } from '@/api/http';
import { configure, flush, onLocations, usePresence } from './tracker';

// jest hoists the mocks below above these imports.
jest.mock('@/api/client', () => ({ API_MODE: 'http' }));
jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  Accuracy: { Balanced: 3, High: 4 },
}));
const mockPost = jest.fn();
const post = mockPost;
jest.mock('@/api/http', () => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { ApiError, http: { post: (...a: unknown[]) => mockPost(...a) } };
});

const t0 = Date.now() - 60 * 60_000;
const istToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const day = { electionId: 'e1', name: 'Poll', date: istToday, opensAt: '00:00', closesAt: '23:59', radiusM: 300 };
const loc = (m: number, sec: number) => ({ coords: { latitude: 30.9 + m / 111_320, longitude: 75.7, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: t0 + sec * 1000 });

beforeEach(() => {
  post.mockReset();
  usePresence.setState({ mid: null, day: null, booths: [], local: null, queue: [], lastSentAt: null, lastWarnAt: null, server: null, permission: 'granted' });
  configure('mid-1', day, [{ no: 112, lat: 30.9, lng: 75.7 }]);
  usePresence.setState({ permission: 'granted' });
});

describe('presence queue', () => {
  it('TC-PD-U-4 offline: keeps changes (left) and the latest; sends them in order once online', async () => {
    post.mockRejectedValue(new ApiError(0, 'network', 'offline'));
    await onLocations([loc(50, 0) as never]);
    await onLocations([loc(60, 120) as never]); // same status → replaces
    await onLocations([loc(700, 240) as never]); // first reading far (still at booth locally) → replaces
    await onLocations([loc(710, 360) as never]); // away → new entry
    const st = usePresence.getState();
    expect(st.local?.status).toBe('away');
    expect(st.queue.map((r) => r.local)).toEqual(['at_booth', 'away']);
    expect(st.queue[0].lat).toBeCloseTo(30.9 + 700 / 111_320, 6);

    post.mockReset();
    post.mockResolvedValue({ stored: true, status: 'away', distanceM: 710, partNo: 112 });
    await flush(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toBe('/v1/m/mid-1/presence');
    expect(Date.parse(post.mock.calls[0][1].at)).toBeLessThan(Date.parse(post.mock.calls[1][1].at));
    expect(post.mock.calls[0][1]).not.toHaveProperty('local');
    expect(usePresence.getState().queue).toHaveLength(0);
    expect(usePresence.getState().server?.status).toBe('away');
  });

  it('a refused report is dropped, not retried forever', async () => {
    post.mockRejectedValue(new ApiError(403, 'forbidden', 'no'));
    await onLocations([loc(10, 0) as never]);
    expect(usePresence.getState().queue).toHaveLength(0);
  });
});
