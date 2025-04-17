import * as CSS from 'csstype';
import {
  colorConversion,
  mapBorderStyle,
  pixelsToTwips,
} from '../utils/html.utils';
import { DocumentElement, StyleMapping } from './types';
import { ShadingType, WidthType } from 'docx';

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

const textAlignMap: Record<string, string> = {
  start: 'left', // CSS “start” → left in LTR
  left: 'left',
  end: 'right', // CSS “end” → right in LTR
  right: 'right',
  center: 'center',
  justify: 'justified', // docx uses “JUSTIFIED”
  justified: 'justified',
};

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
      textAlign: (v) => {
        const key = String(v).trim().toLowerCase();
        const alignment = textAlignMap[key];
        return alignment ? { alignment } : {};
      },
      color: (v) => ({ color: colorConversion(v) }),
      backgroundColor: (v, el) => {
        if (el.type === 'table-cell') {
          return {
            shading: {
              fill: colorConversion(v),
              color: 'auto',
              type: ShadingType.CLEAR,
            },
          };
        } else {
          return { highlight: v };
        }
      },

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
              border: {
                top: { size: w * 8 },
                bottom: { size: w * 8 },
                left: { size: w * 8 },
                right: { size: w * 8 },
              },
            };
      },
      borderLeftColor: (v) => ({
        border: { left: { color: colorConversion(v) } },
      }),
      borderLeftStyle: (v) => ({
        border: { left: { style: mapBorderStyle(v) } },
      }),
      borderLeftWidth: (v) => {
        const w = parseFloat(v);
        return isNaN(w)
          ? {}
          : {
              border: { left: { size: w * 8 } },
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

      padding: (v, el) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const space = pixelsToTwips(px);
        if (el.type === 'table-cell')
          return {
            margins: {
              top: space,
              bottom: space,
              left: space,
              right: space,
            },
          };
        return {
          border: {
            top: { space },
            bottom: { space },
            left: { space },
            right: { space },
          },
        };
      },
      margin: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        // vertical spacing uses twips-per-px = 20, horizontal uses your helper
        const before = px * 20;
        const after = px * 20;
        const horiz = pixelsToTwips(px);

        if (el.type === 'table-cell') {
          // for table‑cells, set cell margins
          return {
            margins: {
              top: horiz,
              bottom: horiz,
              left: horiz,
              right: horiz,
            },
          };
        }

        // for paragraphs/text-runs, use spacing.before/after and indent.left/right
        return {
          spacing: {
            before,
            after,
          },
          indent: {
            left: horiz,
            right: horiz,
          },
        };
      },
      marginTop: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const twips = px * 20;
        if (el.type === 'table-cell') {
          return { margins: { top: twips } };
        }
        return { spacing: { before: twips } };
      },

      marginBottom: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const twips = px * 20;
        if (el.type === 'table-cell') {
          return { margins: { bottom: twips } };
        }
        return { spacing: { after: twips } };
      },

      marginLeft: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const twips = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return { margins: { left: twips } };
        }
        return { indent: { left: twips } };
      },
      paddingLeft: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const space = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return {
            margins: {
              left: space,
            },
          };
        }
        return {
          border: {
            left: { space },
          },
        };
      },
      paddingRight: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const space = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return {
            margins: {
              right: space,
            },
          };
        }
        return {
          border: {
            right: { space },
          },
        };
      },
      paddingTop: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const space = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return {
            margins: {
              top: space,
            },
          };
        }
        return {
          border: {
            top: { space },
          },
        };
      },
      paddingBottom: (v: string, el: DocumentElement) => {
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const space = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return {
            margins: {
              bottom: space,
            },
          };
        }
        return {
          border: {
            bottom: { space },
          },
        };
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
    rawStyles: Partial<Record<keyof CSS.Properties, string | number>>,
    el: DocumentElement
  ): Record<string, unknown> {
    return (Object.keys(rawStyles) as (keyof CSS.Properties)[]).reduce(
      (acc, cssProp) => {
        const mapper = this.mappings[cssProp];
        if (mapper) {
          const newStyle = mapper(rawStyles[cssProp] as string, el) as object;
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
