/** Web: the browser notification if the person allowed it; the in-app banner always shows (spec polling-day V3). */
export async function ensureChannel() {}

export async function requestNotifyPermission() {}

export async function showLocal(title: string, body: string) {
  try {
    const N = (globalThis as { Notification?: { permission: string; new (t: string, o: { body: string }): unknown } }).Notification;
    if (N && N.permission === 'granted') new N(title, { body });
  } catch {
    // ignore
  }
}
