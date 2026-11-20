/** Booth locations CSV (spec polling-day S2). */
type Parsed = { rows: { no: number; lat: number; lng: number }[]; bad: number[] };

/** "part_no,lat,lng" per line; a header line and blank lines are skipped; unreadable lines are reported by number. */
export function parseCsv(text: string): Parsed {
  const rows: Parsed['rows'] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const x = line.trim();
    if (!x || /[a-z]/i.test(x.split(/[,;\t]/)[0] ?? '')) return;
    const [a, b, c] = x.split(/[,;\t]/).map((v) => Number(v.trim()));
    if ([a, b, c].some((v) => !Number.isFinite(v))) bad.push(i + 1);
    else rows.push({ no: a, lat: b, lng: c });
  });
  return { rows, bad };
}
