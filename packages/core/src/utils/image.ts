import { Styles } from '../types';
import imageSize from 'image-size';
import { parseImageSizePx } from './parse';

type ImageDimensions = {
  width: number;
  height: number;
};

type DimensionInput = {
  originalWidth: number;
  originalHeight: number;
  // Optional style overrides (in pixels).
  // Undefined/null is treated as 'auto'.
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
};

/**
 * Calculates the final rendered dimensions of an image as a browser would,
 * considering intrinsic size, explicit styles, and max-width/height constraints.
 */
export function calculateImageSize({
  originalWidth,
  originalHeight,
  width: styleWidth,
  height: styleHeight,
  maxWidth,
  maxHeight,
}: DimensionInput): ImageDimensions {
  // Avoid division by zero
  if (originalHeight === 0) return { width: 0, height: 0 };
  const ratio = originalWidth / originalHeight;

  let finalWidth = originalWidth;
  let finalHeight = originalHeight;

  // Track if a dimension is "locked" (explicitly set by style)
  // If it's locked, it typically won't scale to preserve aspect ratio
  // when the OTHER dimension hits a max-constraint.
  const isWidthLocked = styleWidth !== undefined;
  const isHeightLocked = styleHeight !== undefined;

  if (isWidthLocked && isHeightLocked) {
    // Both defined: Aspect ratio is ignored (image is stretched)
    finalWidth = styleWidth!;
    finalHeight = styleHeight!;
  } else if (isWidthLocked) {
    // Only width defined: Scale height to match ratio
    finalWidth = styleWidth!;
    finalHeight = finalWidth / ratio;
  } else if (isHeightLocked) {
    // Only height defined: Scale width to match ratio
    finalWidth = finalHeight * ratio;
    finalHeight = styleHeight!;
  }
  // If neither defined, we stay at originalWidth/Height

  // Apply max-width
  if (maxWidth !== undefined && finalWidth > maxWidth) {
    finalWidth = maxWidth;
    // Only scale height if it wasn't explicitly locked by a style property
    if (!isHeightLocked) {
      finalHeight = finalWidth / ratio;
    }
  }

  // Apply max-height
  // Note: We check against the CURRENT finalHeight (which might have just changed above)
  if (maxHeight !== undefined && finalHeight > maxHeight) {
    finalHeight = maxHeight;
    // Only scale width if it wasn't explicitly locked by a style property
    if (!isWidthLocked) {
      finalWidth = finalHeight * ratio;
    }
  }

  return {
    width: finalWidth,
    height: finalHeight,
  };
}

export const resolveImageSize = (
  imageDataBuffer: Buffer | Uint8Array,
  styles: Styles
  // TODO: Add options to disable/enable max width/height if needed
  // options?: {}
) => {
  let originalWidth = 100;
  let originalHeight = 100;

  try {
    const { width: w = 100, height: h = 100 } = imageSize(imageDataBuffer);
    originalWidth = w;
    originalHeight = h;
  } catch (
    // Ignore errors from image-size
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error
  ) {}

  const finalDimensions = calculateImageSize({
    originalWidth,
    originalHeight,
    width: parseImageSizePx(styles.width?.toString()),
    height: parseImageSizePx(styles.height?.toString()),
    maxWidth: parseImageSizePx(styles.maxWidth?.toString()),
    maxHeight: parseImageSizePx(styles.maxHeight?.toString()),
  });

  return finalDimensions;
};
