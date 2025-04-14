import * as CSS from 'csstype';
import {
  colorConversion,
  mapBorderStyle,
  pixelsToTwips,
} from '../utils/html.utils';
import { StyleMapping } from './types';
import { WidthType } from 'docx';

const parseWidth = (value: string) => {
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

function deepMerge<T extends object, U extends object>(
  target: T,
  source: U
): T & U {
  const result = { ...target } as T & U;
  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key];
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue)
    ) {
      const targetValue = (target as Record<string, unknown>)[key];
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
          ? (targetValue as Record<string, unknown>)
          : {},
        sourceValue as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }
  return result;
}

// @To-do: Consider making the conversion from px or any other size extensible
export class StyleMapper {
  protected mappings: StyleMapping = {};

  constructor() {
    this.initializeDefaultMappings();
  }

  // Central place for all default mappings
  protected initializeDefaultMappings(): void {
    this.mappings = {
      // Text-related styles
      fontFamily: (v: string) => {
        if (!v) return {};
        // Split by comma in case multiple fonts are provided, then remove quotes and trim whitespace.
        const fonts = v
          .split(',')
          .map((font) => font.trim().replace(/['"]/g, ''));
        // Return the first font as the primary font
        return { font: fonts[0] };
      },
      fontWeight: (v) => {
        return v === 'bold' ? { bold: true } : {};
      },
      fontStyle: (v) => (v === 'italic' ? { italics: true } : {}),
      textDecoration: (v) =>
        v === 'underline'
          ? { underline: {} }
          : v === 'line-through'
            ? { strike: true }
            : {},
      textTransform: (v) =>
        v === 'uppercase'
          ? { allCaps: true }
          : v === 'capitalize'
            ? { smallCaps: true }
            : {},
      textAlign: (v) => ({ alignment: v }), // left, right, center, justify
      color: (v) => ({ color: colorConversion(v) }),
      backgroundColor: (v) => ({
        highlight: v,
      }),

      // Font size
      fontSize: (v) => {
        if (v.endsWith('px')) {
          const px = parseFloat(v.slice(0, -2));
          return { size: Math.round(px * 1.5) };
        } else if (v.endsWith('%')) {
          const base = 16;
          const percent = parseFloat(v.slice(0, -1));
          return { size: Math.round(base * (percent / 100) * 1.5) };
        } else {
          const num = parseFloat(v);
          return !isNaN(num) ? { size: Math.round(num * 1.5) } : {};
        }
      },

      // Line height and spacing
      lineHeight: (v) => {
        const num = parseFloat(v);
        if (isNaN(num)) return {};

        return {
          spacing: {
            line: Math.round(num * 240), // 1 = 240 twips, which is single line spacing
          },
        };
      },
      marginTop: (v) => {
        const px = parseFloat(v);
        return isNaN(px) ? {} : { spacing: { before: px * 20 } };
      },
      marginBottom: (v) => {
        const px = parseFloat(v);
        return isNaN(px) ? {} : { spacing: { after: px * 20 } };
      },
      width: (v) => {
        const parsed = parseWidth(v); // use helper above
        return parsed ? { width: parsed } : {};
      },

      letterSpacing: (v) => {
        const px = parseFloat(v);
        return !isNaN(px) ? { characterSpacing: Math.round(px * 10) } : {};
      },

      // // Table-related
      // border: (v) => ({
      //   borders: { top: {}, bottom: {}, left: {}, right: {} },
      // }), // Add parsing logic as needed
      borderColor: (v) => ({
        borders: {
          top: { color: colorConversion(v) },
          bottom: { color: colorConversion(v) },
          left: { color: colorConversion(v) },
          right: { color: colorConversion(v) },
        },
      }),
      borderStyle: (v) => ({
        borders: {
          top: { style: mapBorderStyle(v) },
          bottom: { style: mapBorderStyle(v) },
          left: { style: mapBorderStyle(v) },
          right: { style: mapBorderStyle(v) },
        },
      }),
      borderWidth: (v) => {
        const w = parseFloat(v);
        return isNaN(w)
          ? {}
          : {
              borders: {
                top: { size: w * 8 },
                bottom: { size: w * 8 },
                left: { size: w * 8 },
                right: { size: w * 8 },
              },
            };
      },
      verticalAlign: (v) =>
        v === 'middle'
          ? { verticalAlign: 'center' }
          : v === 'bottom'
            ? { verticalAlign: 'bottom' }
            : v === 'super'
              ? { superScript: true }
              : v === 'sub'
                ? { subScript: true }
                : {},

      padding: (v) => {
        const px = parseFloat(v);
        return isNaN(px)
          ? {}
          : {
              margins: {
                top: px,
                bottom: px,
                left: px,
                right: px,
              },
            };
      },

      // List-related
      marginLeft: (v) => {
        const px = parseFloat(v);
        return !isNaN(px) ? { indent: { left: pixelsToTwips(px) } } : {};
      },
      paddingLeft: (v) => {
        const px = parseFloat(v);
        return !isNaN(px) ? { indent: { left: pixelsToTwips(px) } } : {};
      },
      listStyleType: (v) =>
        v === 'decimal'
          ? { numbering: 'decimal' }
          : v === 'disc'
            ? { bullet: true }
            : {},
    };
  }

  // Method to map raw styles to a generic style object
  public mapStyles(
    rawStyles: Partial<Record<keyof CSS.Properties, string | number>>
  ): Record<string, unknown> {
    return (Object.keys(rawStyles) as (keyof CSS.Properties)[]).reduce(
      (acc, cssProp) => {
        const mapper = this.mappings[cssProp];
        if (mapper) {
          const newStyle = mapper(rawStyles[cssProp] as string) as object;
          // Deep merge the new style into the accumulator
          return deepMerge(acc, newStyle);
        }
        return acc;
      },
      {}
    );
  }

  // Method to add or override a mapping
  public addMapping(mappings: StyleMapping): void {
    Object.entries(mappings).forEach((entries) => {
      this.mappings[entries[0] as keyof CSS.Properties] = entries[1];
    });
  }
}
