/** Relation word in the app's language (spec bilingual-roll L3): S/o → पुत्र / ਪੁੱਤਰ. */
import type { TFunction } from 'i18next';
import type { Relation } from '@/api/types';

const KEY: Record<Relation, string> = { 'S/o': 'so', 'W/o': 'wo', 'D/o': 'do' };
export const relText = (t: TFunction, r: Relation) => t(`rel.${KEY[r] ?? 'so'}`);
