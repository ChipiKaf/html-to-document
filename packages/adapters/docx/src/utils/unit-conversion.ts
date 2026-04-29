export const DPI = 96;
export const TWIPS_PER_PIXEL = 15; // 1 pixel = 15 twips
export const TWIPS_PER_PT = 20;
export const TWIPS_PER_PC = 240;
export const TWIPS_PER_INCH = 1440; // 1 inch = 1440 twips
export const TWIPS_PER_CM = 567; // 1 cm = 567 twips
export const TWIPS_PER_MM = 56.7;
export const CM_PER_INCH = 2.54;
export const EMUS_PER_TWIP = 635;

export const pixelsToTwips = (pixels: number): number => {
  return Math.round(pixels * TWIPS_PER_PIXEL);
};

export const inchesToTwips = (inches: number): number => {
  return Math.round(inches * TWIPS_PER_INCH);
};

export const cmToTwips = (cm: number): number => {
  return Math.round(cm * TWIPS_PER_CM);
};

export const cmToInches = (cm: number): number => {
  return cm / CM_PER_INCH;
};

export const inchesToPixels = (inches: number): number => {
  return Math.round(inches * DPI);
};

export const twipsToHalfPoints = (twips: number): number => {
  return Math.round(twips / 10);
};

export const twipsToEighthsOfPoint = (twips: number): number => {
  return Math.round((twips * 8) / TWIPS_PER_PT);
};

export const twipsToEmus = (twips: number): number => {
  return Math.round(twips * EMUS_PER_TWIP);
};
