/** TC-SF-4 (docs/test-cases/security-fixes.md): every outside script and stylesheet of the map is pinned. */
import { mapHtml } from './mapHtml';

it('TC-SF-4 each https script / stylesheet has an integrity hash and crossorigin', () => {
  const html = mapHtml({ bridge: 'parent', accent: '#000', fitLabel: '' });
  const tags = html.match(/<(script|link)\b[^>]*(src|href)="https:[^"]+"[^>]*>/g) ?? [];
  expect(tags).toHaveLength(4);
  for (const t of tags) {
    expect(t).toMatch(/integrity="sha384-[A-Za-z0-9+/=]{64}"/);
    expect(t).toContain('crossorigin="anonymous"');
  }
});
