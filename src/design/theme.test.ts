import { accentFrom, applyBrand, contrastOnWhite, paletteFrom, themed, useThemeVersion } from './theme';
import { colors } from './tokens';

// TC-C1-3: the party colour is made readable (≥ 4.5:1 with white) without changing its hue family.
describe('customer theme', () => {
  it('keeps a dark enough colour as it is; darkens a mid green just enough', () => {
    expect(accentFrom('#0F5132')).toBe('#0F5132');
    const g = accentFrom('#15803D');
    expect(contrastOnWhite(g)).toBeGreaterThanOrEqual(5.2);
    expect(contrastOnWhite(g)).toBeLessThan(6.5);
  });

  it('darkens a light colour (gold) until it passes 4.5:1', () => {
    const a = accentFrom('#FFD700');
    expect(contrastOnWhite(a)).toBeGreaterThanOrEqual(5.2);
    expect(a).not.toBe('#FFD700');
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b); // still a yellow/brown, not grey or blue
    expect(g).toBeGreaterThan(b);
  });

  it('falls back to the ElVote brand blue for empty or bad input', () => {
    expect(accentFrom(null)).toBe('#184BA1');
    expect(accentFrom('green')).toBe('#184BA1');
  });

  it('applyBrand updates tokens and rebuilds themed style sheets', () => {
    const s = themed(() => ({ chip: { backgroundColor: colors.accent } }));
    applyBrand('#0E7490');
    expect(colors.accent).toBe(paletteFrom('#0E7490').accent);
    expect(s.chip.backgroundColor).toBe(colors.accent);
    const v = useThemeVersion.getState().v;
    applyBrand('#0e7490'); // same colour → no change
    expect(useThemeVersion.getState().v).toBe(v);
    applyBrand(null);
    expect(colors.accent).toBe('#184BA1');
    expect(s.chip.backgroundColor).toBe('#184BA1');
  });
});
