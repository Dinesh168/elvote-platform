import type { Booth, Branding, Voter } from '@/api/types';
import { accentFrom } from '@/design/theme';
import { colors } from '@/design/tokens';

const esc = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface SlipLabels {
  ballot: string; booth: string; sno: string; name: string; relative: string; age: string; gender: string; address: string; epic: string;
  pollDay: string; genders: Record<string, string>;
}

export function slipRows(v: Voter, booth: Booth | undefined, l: SlipLabels): [string, string][] {
  return [
    [l.booth, `${v.booth}${booth ? ` · ${booth.name}` : ''}`],
    [l.sno, String(v.sno)],
    [l.name, v.name],
    [l.relative, `${v.relation} ${v.relative}`],
    [l.age, String(v.age)],
    [l.gender, l.genders[v.gender] ?? v.gender],
    [l.address, `H.No ${v.house}${v.ward ? `, Ward ${v.ward}` : ''}${v.village ? `, ${v.village}` : ''}`],
    [l.epic, v.epic],
  ];
}

/** Printable voter slip (V-CARD-5, D16). Shared as PDF on phones, printed on web. All values are escaped. */
/** C6: the WhatsApp text from the customer's template ({name}, {sno}, {booth}, {date}); plain text, no HTML. */
export function shareTextFrom(template: string | null | undefined, v: Voter, date: string | null): string | null {
  if (!template?.trim()) return null;
  return template
    .replaceAll('{name}', v.name)
    .replaceAll('{sno}', String(v.sno))
    .replaceAll('{booth}', String(v.booth))
    .replaceAll('{date}', date ?? '');
}

export function slipHtml(v: Voter, booth: Booth | undefined, b: Branding, l: SlipLabels, photoUrl?: string | null): string {
  const colour = accentFrom(b.brandColour);
  // Only http(s) image URLs from our own server reach here; anything else is dropped.
  const photo = photoUrl && /^https?:\/\/[^"'<>\s]+$/.test(photoUrl) ? photoUrl : null;
  const rows = slipRows(v, booth, l).map(([k, val]) => `<tr><th>${esc(k)}</th><td>${esc(val)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
body{font-family:-apple-system,Segoe UI,Roboto,'Noto Sans Gurmukhi',sans-serif;margin:0;padding:24px;color:${colors.text}}
.card{max-width:420px;margin:0 auto;border:1px solid ${colors.separator};border-radius:14px;overflow:hidden}
.head{background:${colour};color:${colors.textOnAccent};padding:16px 18px}
.head h1{margin:0;font-size:20px}.head p{margin:4px 0 0;font-size:14px;opacity:.9}
.photo{float:left;width:56px;height:56px;border-radius:28px;margin-right:12px;object-fit:cover;background:${colors.surface}}
.slogan{font-style:italic}
.ballot{float:right;text-align:center;background:${colors.surface};color:${colour};border-radius:10px;padding:4px 12px;font-weight:700}
.ballot small{display:block;font-size:10px;letter-spacing:.06em}
table{width:100%;border-collapse:collapse;font-size:15px}
th{width:34%;text-align:left;color:${colors.textSecondary};font-weight:500;padding:9px 18px;border-top:1px solid ${colors.separator};vertical-align:top}
td{padding:9px 18px 9px 0;border-top:1px solid ${colors.separator};font-weight:600}
.foot{padding:12px 18px;background:${colors.bg};font-size:13px;color:${colors.textSecondary}}
</style></head><body><div class="card">
<div class="head">${b.ballotNo ? `<div class="ballot"><small>${esc(l.ballot)}</small>${esc(b.ballotNo)}</div>` : ''}
${photo ? `<img class="photo" src="${esc(photo)}" alt="">` : ''}<h1>${esc(b.candidateName ?? b.partyName)}</h1><p>${esc(b.partyName)}</p>${b.slogan ? `<p class="slogan">“${esc(b.slogan)}”</p>` : ''}<div style="clear:both"></div></div>
<table>${rows}</table>
<div class="foot">${esc(l.pollDay)}</div></div></body></html>`;
}
