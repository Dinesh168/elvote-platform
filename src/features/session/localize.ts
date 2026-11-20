/**
 * spec bilingual-roll L3: voter and booth data follow the person's language. The regional value is shown when the app
 * language is the assembly's data language (Hindi or Punjabi) and the value exists; otherwise English. English is kept
 * alongside (`nameEn`, `relativeEn`) so search matches both scripts.
 */
import type { Booth, Voter } from '@/api/types';

export type DataLang = 'hi' | 'pa';

/** Show regional data? */
export const showRegional = (appLang: string, dataLang: DataLang | null | undefined) => !!dataLang && appLang === dataLang;

export function localizeVoter(v: Voter, regional: boolean): Voter {
  const base = { ...v, nameEn: v.nameEn ?? v.name, relativeEn: v.relativeEn ?? v.relative, villageEn: v.villageEn ?? v.village };
  if (!regional) return { ...base, name: base.nameEn, relative: base.relativeEn, village: base.villageEn };
  return { ...base, name: v.nameLocal || base.nameEn, relative: v.relativeLocal || base.relativeEn, village: v.villageLocal || base.villageEn };
}

export function localizeBooth(b: Booth, regional: boolean): Booth {
  const base = { ...b, nameEn: b.nameEn ?? b.name, villageEn: b.villageEn ?? b.village, addressEn: b.addressEn ?? b.address };
  if (!regional) return { ...base, name: base.nameEn, village: base.villageEn, address: base.addressEn };
  return { ...base, name: b.nameLocal || base.nameEn, village: b.villageLocal || base.villageEn, address: b.addressLocal || base.addressEn };
}

/** Lower-case text of every name the voter is known by (both scripts), for search. */
export function voterNames(v: Voter): string[] {
  return [v.name, v.nameEn, v.nameLocal, v.relative, v.relativeEn, v.relativeLocal].filter((x): x is string => !!x).map((x) => x.toLowerCase());
}
