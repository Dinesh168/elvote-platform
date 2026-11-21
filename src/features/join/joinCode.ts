/**
 * Team code from a typed code or a scanned QR (spec usability-r2 J1). The team QR holds a link
 * `https://<site>/join?code=ABCD1234` (also `/join/ABCD1234`), so the phone camera opens the join page too.
 */
const CODE = /^[A-Z0-9]{4,20}$/;

export function cleanCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

/** The code inside a scanned text, or null when it is not a team code / ElVote join link. */
export function codeFromScan(text: string): string | null {
  const raw = text.trim();
  const m = raw.match(/[?&]code=([A-Za-z0-9]{4,20})/) ?? raw.match(/\/join\/([A-Za-z0-9]{4,20})(?:[/?#]|$)/);
  if (m) return m[1].toUpperCase();
  return CODE.test(raw.toUpperCase()) ? raw.toUpperCase() : null;
}

export function joinLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/join?code=${encodeURIComponent(code)}`;
}
