import fs from 'fs';
import path from 'path';
import { colors, group } from './tokens';

describe('tokens (TC-O5-2)', () => {
  it('has the fixed group colours and tints', () => {
    expect(group.our).toMatchObject({ strong: '#1B7F3B', tint: '#F0FAF2' });
    expect(group.target).toMatchObject({ strong: '#B45309', tint: '#FFF8EB' });
    expect(group.opp).toMatchObject({ strong: '#D70015', tint: '#FFF0F1' });
  });

  it('has the iOS-style base colours', () => {
    expect(colors.bg).toBe('#F2F2F7');
    expect(colors.accent).toBe('#4F46E5');
    expect(colors.textSecondary).toBe('#6C6C70');
  });
});

describe('no hex colours in screens (TC-O5-1)', () => {
  const roots = ['app', 'features'].map((d) => path.join(__dirname, '..', d));
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
    }
  };
  roots.forEach(walk);

  it('screens and features use tokens only', () => {
    const offenders = files.filter((f) => /['"`]#[0-9a-fA-F]{3,8}['"`]/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
