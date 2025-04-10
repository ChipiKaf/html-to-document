import * as CSS from 'csstype';
import {
  colorConversion,
  mapBorderStyle,
  pixelsToTwips,
} from '../utils/html.utils';
import { StyleMapping } from './types';
import { HighlightColor, WidthType } from 'docx';

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
      textAlign: (v) => ({ alignment: v as any }), // left, right, center, justify
      color: (v) => ({ color: colorConversion(v) }),
      backgroundColor: (v) => ({ highlight: v }),

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
        return !isNaN(num) ? { spacing: { line: Math.round(num * 240) } } : {};
      },
      width: (v) => {
        const parsed = parseWidth(v); // use helper above
        return parsed ? { width: parsed } : {};
      },

      letterSpacing: (v) => {
        const px = parseFloat(v);
        return !isNaN(px) ? { characterSpacing: Math.round(px * 10) } : {};
      },

      // Table-related
      border: (v) => ({
        borders: { top: {}, bottom: {}, left: {}, right: {} },
      }), // Add parsing logic as needed
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
          : { verticalAlign: 'top' },

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
    rawStyles: Partial<Record<keyof CSS.Properties, string>>
  ): Record<string, any> {
    return (Object.keys(rawStyles) as (keyof CSS.Properties)[]).reduce(
      (acc, cssProp) => {
        const mapper = this.mappings[cssProp];
        if (mapper) {
          return { ...acc, ...mapper(rawStyles[cssProp] as string) };
        }
        // Optionally log or ignore unmapped styles
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
