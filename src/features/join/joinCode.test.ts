/** TC-R2-13 (docs/test-cases/usability-r2.md): reading the team code from a scan. */
import { cleanCode, codeFromScan, joinLink } from './joinCode';

describe('team code from QR (J1)', () => {
  it('TC-R2-13 reads the code from the join link, a path link or the bare code', () => {
    expect(codeFromScan('https://demo.champn.in/join?code=JVP6AB12')).toBe('JVP6AB12');
    expect(codeFromScan('https://demo.champn.in/join/jvp6ab12')).toBe('JVP6AB12');
    expect(codeFromScan('https://demo.champn.in/join?x=1&code=abcd')).toBe('ABCD');
    expect(codeFromScan('  RAMPUR24 ')).toBe('RAMPUR24');
  });
  it('ignores other QR codes', () => {
    expect(codeFromScan('https://example.com/some/page')).toBeNull();
    expect(codeFromScan('WIFI:S:home;T:WPA;P:secret;;')).toBeNull();
    expect(codeFromScan('ab')).toBeNull();
  });
  it('cleans typed codes and builds the link', () => {
    expect(cleanCode('jvp-6ab 12')).toBe('JVP6AB12');
    expect(joinLink('https://demo.champn.in/', 'JVP6AB12')).toBe('https://demo.champn.in/join?code=JVP6AB12');
  });
});
