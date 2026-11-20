/** TC-PD-U-1..4 (docs/test-cases/polling-day.md). */
import { distanceM, inWindow, judge, nextChange, type Local } from './rules';

const day = { electionId: 'e', name: 'Poll', date: '2027-02-20', opensAt: '05:00', closesAt: '19:00', radiusM: 300 };
// India time = UTC + 5:30
const ist = (hhmm: string, date = '2027-02-20') => new Date(`${date}T${hhmm}:00+05:30`);
const B = [{ no: 112, lat: 30.9, lng: 75.7 }, { no: 113, lat: 31.1, lng: 75.95 }];
const north = (m: number) => ({ lat: 30.9 + m / 111_320, lng: 75.7 });

describe('polling day rules', () => {
  it('TC-PD-U-1 distance (haversine) matches a known pair', () => {
    // 0.01° of latitude ≈ 1,112 m
    expect(Math.abs(distanceM({ lat: 30.9, lng: 75.7 }, { lat: 30.91, lng: 75.7 }) - 1112)).toBeLessThan(2);
    expect(distanceM(B[0], B[0])).toBe(0);
  });

  it('TC-PD-U-2 the window is the poll date between opens and closes, India time', () => {
    expect(inWindow(day, ist('04:59'))).toBe(false);
    expect(inWindow(day, ist('05:00'))).toBe(true);
    expect(inWindow(day, ist('18:59'))).toBe(true);
    expect(inWindow(day, ist('19:00'))).toBe(false);
    expect(inWindow(day, ist('10:00', '2027-02-19'))).toBe(false);
    expect(inWindow(null, ist('10:00'))).toBe(false);
  });

  it('TC-PD-U-3 away only after two readings a minute apart; poor readings ignored; no booth locations', () => {
    let s: Local | null = null;
    const t0 = Date.parse('2027-02-20T05:00:00Z');
    const step = (pos: { lat: number; lng: number }, sec: number, accuracy = 20) => (s = judge(s, { ...pos, accuracy, at: t0 + sec * 1000 }, B, 300));
    expect(step(north(100), 0).status).toBe('at_booth');
    expect(step(north(650), 120).status).toBe('at_booth');
    const away = step(north(660), 240);
    expect(away.status).toBe('away');
    expect(away.event).toBe('left');
    expect(away.partNo).toBe(112);
    expect(step(north(10), 300, 250).status).toBe('away'); // accuracy 250 m: ignored
    const back = step(north(10), 360);
    expect(back.status).toBe('at_booth');
    expect(back.event).toBe('returned');
    expect(judge(null, { ...north(5000), accuracy: 10, at: t0 }, [], 300).status).toBe('no_booth_location');
    // two readings only 30 s apart are not enough
    s = null;
    step(north(10), 0);
    step(north(700), 10);
    expect(step(north(710), 40).status).toBe('at_booth');
    expect(step(north(720), 80).status).toBe('away');
  });

  it('nextChange tells when the gate must be re-checked', () => {
    expect(nextChange(day, ist('04:00'))).toBe(ist('05:00').getTime());
    expect(nextChange(day, ist('12:00'))).toBe(ist('19:00').getTime());
    expect(nextChange(day, ist('20:00'))).toBeNull();
  });
});
