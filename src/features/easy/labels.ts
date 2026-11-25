/** spec easy-redesign: words for filters, sorts and shortcuts (en / hi / pa through i18n). */
import type { TFunction } from 'i18next';
import type { Voter } from '@/api/types';
import { isPreset, type Preset } from '@/features/voters/filter';
import { activeKeys, type FilterKey, type HouseColour, type VoterFilters, type VoterSort } from './logic';

export function filterWord(t: TFunction, k: FilterKey, v: string): string {
  switch (k) {
    case 'grp': return v === 'none' ? t('groups.none') : t(`groups.${v}`);
    case 'mobile': return v === 'with' ? t('easy.f.withPhone') : t('easy.f.noPhone');
    case 'age': return t(`easy.f.${v}`);
    case 'sex': return t(`easy.f.sex${v}`);
    case 'res': return t(`voters.res.${v}`);
    case 'help': return t('easy.needsHelp');
    case 'voted': return v === 'yes' ? t('easy.voted') : t('easy.f.notVoted');
  }
}
/** "Ours + With phone" (first two), for titles and the path line. */
export function filterTitle(t: TFunction, f: VoterFilters): string {
  const ks = activeKeys(f);
  if (!ks.length) return t('easy.allVoters');
  return ks.slice(0, 2).map((k) => filterWord(t, k, String(f[k]))).join(' + ');
}
export const sortWord = (t: TFunction, s: VoterSort) => t(`easy.sortBy.${s}`);
export const houseWord = (t: TFunction, c: HouseColour | 'all') => (c === 'all' ? t('easy.allHouses') : c === 'left' ? t('easy.notVisited') : t(`easy.houses.${c}`));

/** Older links (Home numbers, Polling day, stats pages) still pass chip / preset; map them to filters. */
const PRESET_F: Record<Preset, VoterFilters> = {
  withMobile: { mobile: 'with' }, withoutMobile: { mobile: 'without' }, ourMobile: { grp: 'our', mobile: 'with' },
  targetMobile: { grp: 'target', mobile: 'with' }, oppMobile: { grp: 'opp', mobile: 'with' }, ageFirst: { age: 'a1' }, ageYoung: { age: 'a2' },
  ageMid: { age: 'a3' }, ageSenior: { age: 'a4' }, male: { sex: 'M' }, female: { sex: 'F' }, third: { sex: 'T' },
  needsHelp: { help: 'yes', voted: 'no' }, notVoted: { voted: 'no' }, ourNotVoted: { grp: 'our', voted: 'no' },
  targetNotVoted: { grp: 'target', voted: 'no' }, oppNotVoted: { grp: 'opp', voted: 'no' },
};
export function filtersFromParams(p: { f?: string; chip?: string; preset?: string }): VoterFilters {
  if (p.f) {
    try { return JSON.parse(p.f) as VoterFilters; } catch { /* bad link: no filter */ }
  }
  const out: VoterFilters = {};
  if (p.chip === 'todo') out.grp = 'none';
  else if (p.chip === 'our' || p.chip === 'target' || p.chip === 'opp') out.grp = p.chip;
  if (isPreset(p.preset)) Object.assign(out, PRESET_F[p.preset]);
  return out;
}

/** Section of a voter (roll section number + name) for the sticky bands. */
export const sectionKey = (v: Voter) => v.ward || '—';
export const sectionLabel = (t: TFunction, v: Voter) => (v.ward ? t('easy.sectionN', { n: v.ward, name: v.village }) : v.village || t('easy.noSection'));
