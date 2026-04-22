import { WidthType } from 'docx';
import {
  TWIPS_PER_MM,
  TWIPS_PER_PC,
  TWIPS_PER_PIXEL,
  TWIPS_PER_PT,
  cmToTwips,
  inchesToTwips,
  pixelsToTwips,
} from './unit-conversion';

const LENGTH_PATTERN = /^([+-]?\d*\.?\d+)([a-z%]*)$/i;

export type LengthToTwipsOptions = {
  basePx?: number;
  unitless?: 'px' | 'none';
};

/**
 * @returns a number (never NaN) or undefined
 */
export const lengthToTwips = (
  value: string | number | undefined,
  options: LengthToTwipsOptions = {}
): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const basePx = options.basePx ?? 16;
  const unitless = options.unitless ?? 'px';

  if (typeof value === 'number') {
    if (unitless === 'none') return undefined;
    return Math.round(value * TWIPS_PER_PIXEL);
  }

  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  const match = raw.match(LENGTH_PATTERN);
  if (!match) return undefined;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return undefined;
  const unit = match[2];

  if (!unit) {
    if (unitless === 'none') return undefined;
    return pixelsToTwips(num);
  }

  switch (unit) {
    case 'px':
      return pixelsToTwips(num);
    case 'pt':
      return Math.round(num * TWIPS_PER_PT);
    case 'pc':
      return Math.round(num * TWIPS_PER_PC);
    case 'in':
      return inchesToTwips(num);
    case 'cm':
      return cmToTwips(num);
    case 'mm':
      return Math.round(num * TWIPS_PER_MM);
    case 'em':
    case 'rem':
      return pixelsToTwips(num * basePx);
    case '%':
      return Math.round((num / 100) * basePx * TWIPS_PER_PIXEL);
    default:
      return undefined;
  }
};

export const parseWidth = (value: string) => {
  const raw = value.trim().toLowerCase();
  const token = raw.split(/\s+/)[0] ?? '';
  if (token.endsWith('%')) {
    const percent = parseFloat(token);
    return Number.isFinite(percent)
      ? {
          size: Math.round(percent),
          type: WidthType.PERCENTAGE,
        }
      : undefined;
  }
  const twips = lengthToTwips(token);
  return typeof twips === 'number'
    ? {
        size: twips,
        type: WidthType.DXA,
      }
    : undefined;
};
