/** TC-V4-1, TC-V4-3, TC-V4-5, TC-V4-7: logic behind Tasks, Surnames, Voter slip and Help list. */
import type { Task, Voter } from '@/api/types';
import { createSeed } from '@/api/mock/seed';
import { helpList } from '@/features/poll/help';
import { shareTextFrom, slipHtml, type SlipLabels } from '@/features/slip/slip';
import { taskStatus } from '@/features/tasks/status';
import { surnames } from '@/features/voters/surnames';

const db = createSeed();
const v = (o: Partial<Voter>): Voter => ({
  id: 'x', booth: 112, sno: 1, name: 'A B', relation: 'S/o', relative: 'C', age: 30, gender: 'M', house: '1', ward: '3', village: 'Rampur',
  epic: 'PBA1000001', residence: 'here', needsHelp: false, ...o,
});

describe('surnames (TC-V4-3)', () => {
  it('groups by the last word, biggest first, counts add up', () => {
    const rows = surnames(db.voters, 112);
    const total = db.voters.filter((x) => x.booth === 112).length;
    expect(rows.reduce((a, r) => a + r.count, 0)).toBe(total);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
    for (const r of rows) expect(r.our + r.target + r.opp + r.notMet).toBe(r.count);
  });
  it('a one-word name is its own surname', () => {
    expect(surnames([v({ name: 'Gurdev' })], 112)[0].surname).toBe('Gurdev');
  });
});

describe('help list (TC-V4-7)', () => {
  it('only needs-help voters who have not voted, grouped by house in roll order', () => {
    const list = helpList([
      v({ id: 'a', sno: 3, house: '2', needsHelp: true }),
      v({ id: 'b', sno: 1, house: '1', needsHelp: true }),
      v({ id: 'c', sno: 2, house: '1', needsHelp: true, votedAt: '2027-02-14T08:00:00Z' }),
      v({ id: 'd', sno: 4, house: '2', needsHelp: false }),
      v({ id: 'e', sno: 5, house: '2', needsHelp: true, booth: 113 }),
    ], 112);
    expect(list.map((h) => [h.house, h.voters.map((x) => x.id)])).toEqual([['1', ['b']], ['2', ['a']]]);
  });
  it('is empty when everyone has voted', () => {
    expect(helpList([v({ needsHelp: true, votedAt: 'x' })], 112)).toEqual([]);
  });
});

describe('task status (TC-V4-1)', () => {
  const t = (o: Partial<Task>): Task => ({ id: '1', name: 'W', booths: [112], criteria: {}, dueDate: '2026-12-01', ...o });
  it('not started / ongoing / completed with days left', () => {
    expect(taskStatus(t({ startDate: '2026-11-25' }), '2026-11-19')).toEqual({ status: 'not_started', daysLeft: 12 });
    expect(taskStatus(t({ startDate: '2026-11-10' }), '2026-11-19')).toEqual({ status: 'ongoing', daysLeft: 12 });
    expect(taskStatus(t({}), '2026-12-02')).toEqual({ status: 'completed', daysLeft: 0 });
  });
});

describe('voter slip (TC-V4-5)', () => {
  const L: SlipLabels = { ballot: 'BALLOT', booth: 'Booth', sno: 'S.No', name: 'Name', relative: 'Relative', age: 'Age', gender: 'Gender', address: 'Address', epic: 'EPIC', pollDay: 'Polling day: 14 Feb 2027', genders: { M: 'Male', F: 'Female', T: 'Third gender' } };
  it('has every field and the branding', () => {
    const html = slipHtml(v({ name: 'Ramesh Kumar', sno: 43, age: 58 }), { no: 112, name: 'Govt. School, Rampur', village: 'Rampur' }, { partyName: 'Jan Vikas Party', candidateName: 'Harjit Singh', ballotNo: 3 }, L);
    for (const s of ['Ramesh Kumar', '43', '58', 'Male', 'PBA1000001', 'Govt. School, Rampur', 'Harjit Singh', 'Jan Vikas Party', 'BALLOT', 'Polling day: 14 Feb 2027', 'H.No 1, Ward 3, Rampur']) expect(html).toContain(s);
  });
  it('escapes names (no HTML injection)', () => {
    const html = slipHtml(v({ name: '<img src=x onerror=alert(1)>' }), undefined, { partyName: 'P&Q' }, L);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('P&amp;Q');
  });
  it('ignores a bad brand colour', () => {
    expect(slipHtml(v({}), undefined, { partyName: 'P', brandColour: 'red;}body{x' }, L)).not.toContain('red;}');
  });
});

describe('customer slip (TC-C2/C6)', () => {
  const L: SlipLabels = { ballot: 'BALLOT', booth: 'Booth', sno: 'S.No', name: 'Name', relative: 'Relative', age: 'Age', gender: 'Gender', address: 'Address', epic: 'EPIC', pollDay: 'Polling day', genders: { M: 'Male', F: 'Female', T: 'Third gender' } };
  it('fills the WhatsApp template and returns null when none is set', () => {
    const voter = v({ name: 'Ramesh Kumar', sno: 43, booth: 112 });
    expect(shareTextFrom('Dear {name}, S.No {sno}, booth {booth}, vote on {date}', voter, '14 Feb')).toBe('Dear Ramesh Kumar, S.No 43, booth 112, vote on 14 Feb');
    expect(shareTextFrom('  ', voter, null)).toBeNull();
  });

  it('adds the candidate photo and slogan; drops unsafe photo URLs', () => {
    const b = { partyName: 'Jan Vikas Party', candidateName: 'Harjit Singh', slogan: 'Har ghar <vikas>' };
    const ok = slipHtml(v({}), undefined, b, L, 'http://localhost:4000/files/abc.png');
    expect(ok).toContain('<img class="photo" src="http://localhost:4000/files/abc.png"');
    expect(ok).toContain('Har ghar &lt;vikas&gt;');
    const bad = slipHtml(v({}), undefined, b, L, 'javascript:alert(1)');
    expect(bad).not.toContain('<img');
  });
});
