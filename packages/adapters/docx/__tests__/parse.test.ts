import { describe, expect, it } from 'vitest';
import { lengthToTwips } from '../src/utils/parse';

describe('lengthToTwips', () => {
  it('converts absolute units', () => {
    expect(lengthToTwips('1px')).toBe(15);
    expect(lengthToTwips('1pt')).toBe(20);
    expect(lengthToTwips('1pc')).toBe(240);
    expect(lengthToTwips('1in')).toBe(1440);
    expect(lengthToTwips('1cm')).toBe(567);
    expect(lengthToTwips('1mm')).toBe(57);
  });

  it('converts relative units with a base', () => {
    expect(lengthToTwips('1.5em', { basePx: 20 })).toBe(450);
    expect(lengthToTwips('150%', { basePx: 20 })).toBe(450);
  });

  it('handles unitless values via options', () => {
    expect(lengthToTwips('2')).toBe(30);
    expect(lengthToTwips(2)).toBe(30);
    expect(lengthToTwips('2', { unitless: 'none' })).toBeUndefined();
  });
});
