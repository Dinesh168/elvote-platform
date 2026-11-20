import { layoutFor } from './layout';

// TC-W1-1: layout class from platform + width (spec web-desktop W1).
describe('layoutFor', () => {
  it.each([
    [1440, 'desktop'],
    [1024, 'desktop'],
    [1023, 'rail'],
    [768, 'rail'],
    [767, 'phone'],
    [390, 'phone'],
  ])('web %i px → %s', (w, kind) => expect(layoutFor('web', w)).toBe(kind));

  it('native is always phone, even on a wide tablet', () => {
    expect(layoutFor('android', 1440)).toBe('phone');
    expect(layoutFor('ios', 1366)).toBe('phone');
  });
});
