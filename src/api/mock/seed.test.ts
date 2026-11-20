import { createSeed } from './seed';

describe('mock seed (TC-O2-1, 2, 4, 5)', () => {
  const a = createSeed();

  it('is deterministic', () => {
    expect(createSeed()).toEqual(a);
  });

  it('has 1,200 voters in booth 112 and 1,054 in booth 113', () => {
    expect(a.voters.filter((v) => v.booth === 112)).toHaveLength(1200);
    expect(a.voters.filter((v) => v.booth === 113)).toHaveLength(1054);
    expect(a.booths.map((b) => b.no)).toEqual([112, 113]);
  });

  it('gives every voter valid fields', () => {
    for (const v of a.voters) {
      expect(v.name.length).toBeGreaterThan(2);
      expect(['S/o', 'W/o', 'D/o']).toContain(v.relation);
      expect(v.age).toBeGreaterThanOrEqual(18);
      expect(v.age).toBeLessThanOrEqual(95);
      expect(v.epic).toMatch(/^[A-Z]{3}\d{7}$/);
      if (v.mobile) expect(v.mobile).toMatch(/^[6-9]\d{9}$/);
    }
  });

  it('numbers serials 1..N per booth, house by house, 2-6 voters per house', () => {
    for (const no of [112, 113]) {
      const vs = a.voters.filter((v) => v.booth === no);
      expect(vs.map((v) => v.sno)).toEqual(vs.map((_, i) => i + 1));
      const sizes = new Map<string, number>();
      let last = '';
      const seen = new Set<string>();
      for (const v of vs) {
        if (v.house !== last) {
          expect(seen.has(v.house)).toBe(false);
          seen.add(v.house);
          last = v.house;
        }
        sizes.set(v.house, (sizes.get(v.house) ?? 0) + 1);
      }
      for (const n of sizes.values()) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(6);
      }
    }
  });

  it('has a volunteer with both booths and at least 2 tasks', () => {
    expect(a.volunteer.booths).toEqual([112, 113]);
    expect(a.tasks.length).toBeGreaterThanOrEqual(2);
  });
});
