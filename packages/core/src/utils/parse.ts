const DPI = 96; // Standard screen DPI

/**
 * Helper: convert common CSS length values to pixel count
 */
export const parseImageSizePx = (
  value: string | undefined
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const val = value.trim().toLowerCase();
  if (val.endsWith('px')) {
    const px = parseFloat(val);
    return isNaN(px) ? undefined : px;
  }
  if (val.endsWith('in')) {
    const inches = parseFloat(val);
    return isNaN(inches) ? undefined : inches * DPI; // 96 px per inch
  }
  if (val.endsWith('cm')) {
    const cm = parseFloat(val);
    return isNaN(cm) ? undefined : (cm / 2.54) * DPI; // cm → inch → px
  }
  // If the value is a bare number, assume pixels
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};
