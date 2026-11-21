/** Assembly list for the admin request (spec usability-r2 A1): search by name or number, grouped by district. */
export type CatalogAc = { acNo: number; name: string; nameLocal?: string | null; district?: string | null };
export type AcSection = { title: string; data: CatalogAc[] };

export function filterAcs(list: CatalogAc[], query: string): CatalogAc[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  if (/^\d+$/.test(q)) return list.filter((a) => String(a.acNo).startsWith(q));
  return list.filter((a) => a.name.toLowerCase().includes(q) || (a.nameLocal ?? '').toLowerCase().includes(q) || (a.district ?? '').toLowerCase().includes(q));
}

/** Sections by district (A–Z, assemblies by number). Without districts: blocks of 50 numbers ("1–50"). */
export function groupAcs(list: CatalogAc[], noDistrict = 'Other'): AcSection[] {
  const hasDistricts = list.some((a) => a.district);
  const map = new Map<string, CatalogAc[]>();
  for (const a of [...list].sort((x, y) => x.acNo - y.acNo)) {
    const key = hasDistricts ? a.district || noDistrict : `${Math.floor((a.acNo - 1) / 50) * 50 + 1}–${Math.floor((a.acNo - 1) / 50) * 50 + 50}`;
    map.set(key, [...(map.get(key) ?? []), a]);
  }
  const keys = [...map.keys()];
  if (hasDistricts) keys.sort((a, b) => (a === noDistrict ? 1 : b === noDistrict ? -1 : a.localeCompare(b)));
  return keys.map((k) => ({ title: k, data: map.get(k)! }));
}
