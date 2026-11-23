import { describe, expect, it } from 'vitest';
import { statesFor } from '../src/config.js';

/** spec states-keyboard O1 (TC-SK-1). */
describe('states per environment', () => {
  it('keeps only the listed states, ignores unknown codes', () => {
    expect(statesFor('PB, up,XX').map((s) => s.code)).toEqual(['PB', 'UP']);
  });
  it('empty list = all built-in states', () => {
    expect(statesFor('').map((s) => s.code)).toEqual(['PB', 'HR', 'UP']);
  });
});
