import type * as CSS from 'csstype';
import { capitalize } from '../../utils/text';
import { borderStyleValues } from '../../utils/html.utils';
import { directions } from '../directions';

export const expandBorderShorthands = (
  mappedStyles: Partial<Record<keyof CSS.Properties, string | number>>
) => {
  const capitalizedDirections = directions.map((dir) => capitalize(dir));

  const borderDirections = capitalizedDirections.map(
    (dir) => `border${dir}` as keyof CSS.Properties
  );

  const borderShorthand = (
    prop: string | number
  ): { width?: string | number; style?: string; color?: string } => {
    if (typeof prop === 'number') {
      return {
        width: prop,
      };
    }
    // TODO: Make sure that the order is corect
    const widthRegex =
      /^(thin|medium|thick|(\d+(\.\d+)?(px|em|rem|pt|cm|mm|in|pc|ex|ch|vw|vh|vmin|vmax|%)))$/i;
    let width: string | undefined;
    let style: string | undefined;
    let color: string | undefined;
    const parts = String(prop).split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (!width && widthRegex.test(part)) {
        width = part;
      } else if (
        !style &&
        borderStyleValues.includes(
          // as any is okay when using .includes
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          part as any
        )
      ) {
        style = part;
      } else if (!color) {
        color = part;
      }
    }
    return { width, style, color };
  };

  // Expand 'border' shorthand into individual border properties if not already set
  if (mappedStyles.border) {
    const borderValue = mappedStyles.border;
    const { width, style, color } = borderShorthand(borderValue);
    mappedStyles['borderWidth'] ??= width;
    mappedStyles['borderStyle'] ??= style;
    mappedStyles['borderColor'] ??= color;
  }

  // FIXME: currently if border specifies a color, but the direction doesn't, the direction does not override it, but it should set it to the default.
  borderDirections.forEach((borderDir) => {
    const style = mappedStyles[borderDir];
    if (style === undefined) return;
    const { width, style: borderStyleValue, color } = borderShorthand(style);
    const widthProp = `${borderDir}Width` as keyof CSS.Properties;
    const styleProp = `${borderDir}Style` as keyof CSS.Properties;
    const colorProp = `${borderDir}Color` as keyof CSS.Properties;
    mappedStyles[widthProp] ??= width;
    mappedStyles[styleProp] ??= borderStyleValue;
    mappedStyles[colorProp] ??= color;
  });

  if (mappedStyles.borderWidth) {
    const widthValue = mappedStyles.borderWidth;
    capitalizedDirections.forEach((dir) => {
      const prop = `border${dir}Width` as keyof CSS.Properties;
      mappedStyles[prop] ??= widthValue;
    });
  }
  if (mappedStyles.borderStyle) {
    const styleValue = mappedStyles.borderStyle;
    capitalizedDirections.forEach((dir) => {
      const prop = `border${dir}Style` as keyof CSS.Properties;
      mappedStyles[prop] ??= styleValue;
    });
  }
  if (mappedStyles.borderColor) {
    const colorValue = mappedStyles.borderColor;
    capitalizedDirections.forEach((dir) => {
      const prop = `border${dir}Color` as keyof CSS.Properties;
      mappedStyles[prop] ??= colorValue;
    });
  }

  return mappedStyles;
};
