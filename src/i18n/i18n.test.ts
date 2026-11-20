import en from './en.json';
import pa from './pa.json';
import { i18n, initI18n } from './index';

const flatten = (o: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, key));
    else acc[key] = String(v);
    return acc;
  }, {});

describe('i18n (TC-I-1, TC-I-2)', () => {
  const fe = flatten(en);
  const fp = flatten(pa);

  it('Punjabi has exactly the English keys', () => {
    expect(Object.keys(fp).sort()).toEqual(Object.keys(fe).sort());
  });

  it('no empty strings', () => {
    expect(Object.entries(fp).filter(([, v]) => !v.trim())).toEqual([]);
    expect(Object.entries(fe).filter(([, v]) => !v.trim())).toEqual([]);
  });

  it('interpolates counts in both languages', async () => {
    await initI18n('en');
    expect(i18n.t('home.left', { count: 696 })).toBe('696 voters still to meet');
    await i18n.changeLanguage('pa');
    expect(i18n.t('home.left', { count: 696 })).toContain('696');
  });
});
