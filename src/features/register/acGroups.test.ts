/** TC-R2-16 (docs/test-cases/usability-r2.md): many assemblies — search and grouping. */
import { filterAcs, groupAcs, type CatalogAc } from './acGroups';

const DISTRICTS = ['Patiala', 'Amritsar', 'Ludhiana'];
const BIG: CatalogAc[] = Array.from({ length: 300 }, (_, i) => ({ acNo: i + 1, name: `Seat ${i + 1}`, district: DISTRICTS[i % 3] }));

describe('assembly picker (A1)', () => {
  it('TC-R2-16 searches by number prefix or name and groups by district A–Z', () => {
    expect(filterAcs(BIG, '66').map((a) => a.acNo)).toEqual([66]);
    expect(filterAcs(BIG, '29').map((a) => a.acNo)).toEqual([29, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299]);
    expect(filterAcs(BIG, 'seat 12').length).toBe(11); // 12, 120–129
    expect(filterAcs(BIG, 'amrit').length).toBe(100);
    const g = groupAcs(BIG);
    expect(g.map((x) => x.title)).toEqual(['Amritsar', 'Ludhiana', 'Patiala']);
    expect(g.reduce((n, x) => n + x.data.length, 0)).toBe(300);
    expect(g[0].data[0].acNo).toBeLessThan(g[0].data[1].acNo);
  });

  it('without districts groups by blocks of 50 numbers', () => {
    const g = groupAcs(BIG.map(({ district, ...a }) => a));
    expect(g.map((x) => x.title)).toEqual(['1–50', '51–100', '101–150', '151–200', '201–250', '251–300']);
  });
});
