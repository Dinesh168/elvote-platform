/** TC-BR-L3-1/2 (docs/test-cases/bilingual-roll.md). */
import type { Voter } from '@/api/types';
import { matchesQuery } from '@/features/voters/filter';
import { localizeBooth, localizeVoter, showRegional } from './localize';

const v: Voter = {
  id: '1', booth: 1, sno: 3, name: 'Harjit Singh', relation: 'S/o', relative: 'Ramesh Kumar', age: 40, gender: 'M', house: '12', ward: '1',
  village: 'Rampur', epic: 'TGH1000003', residence: 'here', needsHelp: false,
  nameLocal: 'ਹਰਜੀਤ ਸਿੰਘ', relativeLocal: 'ਰਮੇਸ਼ ਕੁਮਾਰ', villageLocal: 'ਰਾਮਪੁਰ',
};

describe('bilingual data', () => {
  it('TC-BR-L3-1 regional only when the app language is the data language and the value exists', () => {
    expect(showRegional('pa', 'pa')).toBe(true);
    expect(showRegional('hi', 'pa')).toBe(false);
    expect(showRegional('en', 'pa')).toBe(false);
    expect(localizeVoter(v, true)).toMatchObject({ name: 'ਹਰਜੀਤ ਸਿੰਘ', relative: 'ਰਮੇਸ਼ ਕੁਮਾਰ', village: 'ਰਾਮਪੁਰ', nameEn: 'Harjit Singh' });
    expect(localizeVoter(v, false)).toMatchObject({ name: 'Harjit Singh', relative: 'Ramesh Kumar', village: 'Rampur' });
    // switching back and forth keeps both
    expect(localizeVoter(localizeVoter(v, true), false).name).toBe('Harjit Singh');
    const noLocal = { ...v, nameLocal: undefined, relativeLocal: undefined, villageLocal: undefined };
    expect(localizeVoter(noLocal, true).name).toBe('Harjit Singh');
    const b = localizeBooth({ no: 1, name: 'Govt. School', village: 'Rampur', nameLocal: 'ਸਰਕਾਰੀ ਸਕੂਲ', address: 'Main Road', addressLocal: 'ਮੇਨ ਰੋਡ' }, true);
    expect(b).toMatchObject({ name: 'ਸਰਕਾਰੀ ਸਕੂਲ', village: 'Rampur', address: 'ਮੇਨ ਰੋਡ', nameEn: 'Govt. School' });
  });

  it('TC-BR-L3-2 search finds the voter in either script', () => {
    for (const shown of [localizeVoter(v, true), localizeVoter(v, false)]) {
      expect(matchesQuery(shown, 'harjit')).toBe(true);
      expect(matchesQuery(shown, 'ਹਰਜੀਤ')).toBe(true);
      expect(matchesQuery(shown, 'ਰਮੇਸ਼')).toBe(true);
      expect(matchesQuery(shown, 'gurpreet')).toBe(false);
    }
  });
});
