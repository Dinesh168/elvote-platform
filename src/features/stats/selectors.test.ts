import { createSeed } from '@/api/mock/seed';
import { selectBoothStats } from './selectors';

describe('selectBoothStats (TC-O2-3)', () => {
  const { voters } = createSeed();

  it.each([112, 113])('booth %i numbers add up', (booth) => {
    const s = selectBoothStats(voters, booth);
    expect(s.total).toBe(voters.filter((v) => v.booth === booth).length);
    expect(s.met).toBe(s.our + s.target + s.opp);
    expect(s.notMet).toBe(s.total - s.met);
    expect(s.withMobile + s.withoutMobile).toBe(s.total);
    expect(s.ourMobile + s.targetMobile + s.oppMobile).toBeLessThanOrEqual(s.withMobile);
    expect(s.ageFirst + s.ageYoung + s.ageMid + s.ageSenior).toBe(s.total);
    expect(s.male + s.female + s.third).toBe(s.total);
    expect(s.ourHouses + s.targetHouses + s.oppHouses).toBeLessThanOrEqual(s.houses);
    expect(s.ourHousesMobile).toBeLessThanOrEqual(s.ourHouses);
  });

  it('counts a realistic share as already met (30-55%)', () => {
    const s = selectBoothStats(voters, 112);
    expect(s.met / s.total).toBeGreaterThan(0.3);
    expect(s.met / s.total).toBeLessThan(0.55);
  });

  it('counts our group exactly', () => {
    const s = selectBoothStats(voters, 112);
    expect(s.our).toBe(voters.filter((v) => v.booth === 112 && v.group === 'our').length);
  });
});
