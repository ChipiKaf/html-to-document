export const TWIPS_PER_PIXEL = 15; // 1 pixel = 15 twips

export const pixelsToTwips = (pixels: number): number => {
  return Math.round(pixels * TWIPS_PER_PIXEL);
};

export const DPI = 96;

const TWIPS_PER_INCH = 1440; // 1 inch = 1440 twips

export const inchesToTwips = (inches: number): number => {
  return Math.round(inches * TWIPS_PER_INCH);
};

const TWIPS_PER_CM = 567; // 1 cm = 567 twips

export const cmToTwips = (cm: number): number => {
  return Math.round(cm * TWIPS_PER_CM);
};

export const cmToInches = (cm: number): number => {
  return cm / 2.54;
};

export const inchesToPixels = (inches: number): number => {
  return Math.round(inches * DPI);
};
