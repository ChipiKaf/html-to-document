import { WidthType } from 'docx';

export const parseWidth = (value: string) => {
  if (value.endsWith('px')) {
    const px = parseFloat(value);
    return {
      size: Math.round(px * 15),
      type: WidthType.DXA,
    };
  } else if (value.endsWith('%')) {
    const percent = parseFloat(value);
    return {
      size: Math.round(percent),
      type: WidthType.PERCENTAGE,
    };
  } else if (value.endsWith('in')) {
    const inches = parseFloat(value);
    return {
      size: Math.round(inches * 1440),
      type: WidthType.DXA,
    };
  } else if (value.endsWith('cm')) {
    const cm = parseFloat(value);
    return {
      size: Math.round(cm * 567),
      type: WidthType.DXA,
    };
  }
  return undefined;
};

// Helper: convert common CSS length values to pixel count for ImageRun transformations
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
    return isNaN(inches) ? undefined : inches * 96; // 96 px per inch
  }
  if (val.endsWith('cm')) {
    const cm = parseFloat(val);
    return isNaN(cm) ? undefined : (cm / 2.54) * 96; // cm → inch → px
  }
  // If the value is a bare number, assume pixels
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};
