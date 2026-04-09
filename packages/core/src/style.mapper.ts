import * as CSS from 'csstype';
import {
  colorConversion,
  mapBorderStyle,
  pixelsToTwips,
} from './utils/html.utils';
import { DocumentElement, StyleMapping } from './types';
import {
  BorderStyle,
  ShadingType,
  // Floating image positioning and wrapping enums
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  TextWrappingSide,
  IImageOptions,
  ITableRowOptions,
} from 'docx';
import { DeepPartial } from './utils/types';
import { capitalize } from './utils/text';
import { parseImageSizePx, parseWidth } from './utils/parse';
import { expandBorderShorthands } from './styles/shorthands/border';

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
  justify: 'both', // docx uses “JUSTIFIED”
  justified: 'both',
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
      borderSpacing: (v: string, el: DocumentElement) => {
        if (el.type === 'table') {
          // CSS border-spacing accepts one or two values (horizontal [vertical])
          // const parts = v.trim().split(/\s+/);
          const px = parseFloat(v);
          if (!isNaN(px)) {
            // docx only supports uniform spacing, so use the horizontal value
            return {
              cellSpacing: {
                value: pixelsToTwips(px),
                type: 'dxa',
              },
            };
          }
        }
        return {};
      },
      float: (v: string, el: DocumentElement) => {
        const floatValue = v.trim().toLowerCase();
        if (floatValue === 'left' || floatValue === 'right') {
          if (el.type === 'image') {
            // produce a floating image spec for text wrapping
            return {
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.MARGIN,
                  align:
                    floatValue === 'left'
                      ? HorizontalPositionAlign.LEFT
                      : HorizontalPositionAlign.RIGHT,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PARAGRAPH,
                  align: VerticalPositionAlign.TOP,
                },
                wrap: {
                  type: TextWrappingType.SQUARE,
                  side:
                    floatValue === 'left'
                      ? TextWrappingSide.RIGHT
                      : TextWrappingSide.LEFT,
                },
              },
            };
          }
          // fallback: paragraph alignment for non-images
          return { align: floatValue };
        }
        return {};
      },
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
      textDecoration: (v: string) => {
        const decorations = String(v)
          .split(/\s+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        const style: Record<string, unknown> = {};
        if (decorations.includes('underline')) {
          style.underline = {};
        }
        if (decorations.includes('line-through')) {
          style.strike = true;
        }
        return style;
      },
      textTransform: (v) =>
        v === 'uppercase'
          ? { allCaps: true }
          : v === 'capitalize'
            ? { smallCaps: true }
            : {},
      textAlign: (v, el) => {
        if (el.type === 'table') return {};
        const key = String(v).trim().toLowerCase();
        const alignment = textAlignMap[key];
        return alignment ? { alignment } : {};
      },
      color: (v) => ({ color: colorConversion(v) }),
      backgroundColor: (v, el) => {
        if (el.type === 'table') return {};
        // strip “#” and turn CSS names → hex
        const fill = colorConversion(v);
        return {
          shading: {
            type: ShadingType.CLEAR,
            fill, // e.g. "F9F9F9"
            color: 'auto', // text color fallback
          },
        };
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
      width: (v, el) => {
        // For images, map CSS width → ImageRun transformation width
        if (el.type === 'image') {
          const px = parseImageSizePx(String(v));
          return typeof px === 'number'
            ? { transformation: { width: Math.round(px) } }
            : {};
        }

        // All other elements keep using table/paragraph width logic
        const parsed = parseWidth(v);
        return parsed ? { width: parsed } : {};
      },
      height: (v, el) => {
        // For images, map CSS height → ImageRun transformation height
        if (el.type === 'image') {
          const px = parseImageSizePx(String(v));
          return typeof px === 'number'
            ? ({
                transformation: { height: Math.round(px) },
              } satisfies DeepPartial<IImageOptions>)
            : {};
        }
        if (el.type === 'table-row') {
          return {
            height: {
              rule: 'exact',
              value: Math.round((parseImageSizePx(String(v)) ?? 0) * 15),
            },
          } satisfies DeepPartial<ITableRowOptions>;
        }
        const parsed = parseWidth(v);
        return parsed ? { height: parsed } : {};
      },
      minHeight: (v, el) => {
        if (el.type === 'table-row') {
          return {
            height: {
              rule: 'atLeast',
              value: Math.round((parseImageSizePx(String(v)) ?? 0) * 15),
            },
          } satisfies DeepPartial<ITableRowOptions>;
        }
        return {};
      },

      letterSpacing: (v) => {
        const px = parseFloat(v);
        return !isNaN(px) ? { characterSpacing: Math.round(px * 10) } : {};
      },
      border: (v: string, el) => {
        const raw = v.trim();
        // For images, map CSS border shorthand to an outline around the picture
        if (el.type === 'image') {
          // expect format: "<width> <style> <color>" (e.g. "2px dashed #333")
          const parts = raw.split(/\s+/);
          // parse width (px assumed)
          const widthPart = parts[0] || '';
          const px = parseFloat(widthPart);
          if (!isNaN(px) && parts.length >= 2) {
            // parse color as last part
            const colorPart = parts.slice(2).join(' ') || (parts[1] ?? '');
            const color = colorConversion(colorPart);
            return {
              outline: {
                // width in eighths of a point (approx px * 8)
                width: Math.round(px * 8),
                // solid fill stroke of outline
                type: 'solidFill',
                solidFillType: 'rgb',
                value: color,
              },
            };
          }
          return {};
        }
        return {};
      },
      borderWidth: (v, el) => {
        const w = parseFloat(v);
        return isNaN(w)
          ? {}
          : el.type === 'table'
            ? {
                borders: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: w * 8,
                  },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: w * 8,
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size: w * 8,
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: w * 8,
                  },
                },
              }
            : {
                border: {
                  top: { size: w * 8 },
                  bottom: { size: w * 8 },
                  left: { size: w * 8 },
                  right: { size: w * 8 },
                },
              };
      },
      verticalAlign: (v) => {
        switch (v) {
          case 'top':
            return { verticalAlign: 'top' };
          case 'middle':
            return { verticalAlign: 'center' };
          case 'bottom':
            return { verticalAlign: 'bottom' };
          case 'super':
            return { superScript: true };
          case 'sub':
            return { subScript: true };
          default:
            return {};
        }
      },
      ...(Object.fromEntries(
        (['top', 'right', 'bottom', 'left'] as const).flatMap((dir) => {
          const capDir = capitalize(dir);
          return [
            [
              `border${capDir}Color` as keyof CSS.Properties,
              (v: string) => ({
                borders: { [dir]: { color: colorConversion(v) } },
                border: { [dir]: { color: colorConversion(v) } },
              }),
            ],
            [
              `border${capDir}Style` as keyof CSS.Properties,
              (v: string) => ({
                borders: { [dir]: { style: mapBorderStyle(v) } },
                border: { [dir]: { style: mapBorderStyle(v) } },
              }),
            ],
            [
              `border${capDir}Width` as keyof CSS.Properties,
              (v: string) => {
                const w = parseFloat(v);
                return isNaN(w)
                  ? {}
                  : {
                      borders: { [dir]: { size: w * 8 } },
                      border: { [dir]: { size: w * 8 } },
                    };
              },
            ],
          ];
        })
      ) as StyleMapping),

      padding: (v, el) => {
        if (el.type === 'table') return {};
        const px = parseFloat(v);
        if (isNaN(px)) return {};
        const twips = pixelsToTwips(px);

        if (el.type === 'table-cell') {
          return {
            margins: { top: twips, bottom: twips, left: twips, right: twips },
          };
        }

        // treat padding on paragraphs as extra spacing + indentation
        return {
          spacing: {
            before: twips,
            after: twips,
          },
          indent: {
            left: twips,
            right: twips,
          },
        };
      },
      margin: (v: string, el: DocumentElement) => {
        const raw = String(v).trim();
        const px = parseFloat(raw);
        if (isNaN(px)) return {};
        // Only apply wrap margins if image is floated
        const floatDir = (el.styles as { float: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          const dist = pixelsToTwips(px);
          return {
            floating: {
              wrap: {
                margins: { distL: dist, distR: dist, distT: dist, distB: dist },
              },
            },
          };
        }
        // Tables: ignore
        if (el.type === 'table') return {};
        // Table cells: direct cell margins
        if (el.type === 'table-cell') {
          const space = pixelsToTwips(px);
          return {
            margins: { top: space, bottom: space, left: space, right: space },
          };
        }
        // Paragraphs: spacing + indent
        const before = px * 20;
        const after = px * 20;
        const horiz = pixelsToTwips(px);
        return {
          spacing: { before, after },
          indent: { left: horiz, right: horiz },
        };
      },
      marginTop: (v: string, el: DocumentElement) => {
        const px = parseFloat(String(v).trim());
        if (isNaN(px)) return {};
        // Only apply top wrap margin if image is floated
        const floatDir = (el.styles as { float: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          const distT = pixelsToTwips(px);
          return {
            floating: {
              // @ts-expect-error type is missing, but will be set elsewhere - DeepPartial doesn't actually work as expected here
              wrap: { margins: { distT } },
            },
          } satisfies DeepPartial<IImageOptions>;
        }
        if (el.type === 'table') return {};
        const twips = px * 20;
        if (el.type === 'table-cell') {
          return { margins: { top: twips } };
        }
        return { spacing: { before: twips } };
      },

      marginBottom: (v: string, el: DocumentElement) => {
        const px = parseFloat(String(v).trim());
        if (isNaN(px)) return {};
        // Only apply bottom wrap margin if image is floated
        const floatDir = (el.styles as { float: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          const distB = pixelsToTwips(px);
          return {
            floating: {
              // @ts-expect-error type is missing, but will be set elsewhere - DeepPartial doesn't actually work as expected here
              wrap: { margins: { distB } },
            },
          } satisfies DeepPartial<IImageOptions>;
        }
        if (el.type === 'table') return {};
        const twips = px * 20;
        if (el.type === 'table-cell') {
          return { margins: { bottom: twips } };
        }
        return { spacing: { after: twips } };
      },

      marginLeft: (v: string, el: DocumentElement) => {
        const px = parseFloat(String(v).trim());
        if (isNaN(px)) return {};
        // Only apply left wrap margin if image is floated
        const floatDir = (el.styles as { float: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          const distL = pixelsToTwips(px);
          return {
            floating: {
              // @ts-expect-error type is missing, but will be set elsewhere - DeepPartial doesn't actually work as expected here
              wrap: {
                margins: { distL },
              },
            },
          } satisfies DeepPartial<IImageOptions>;
        }
        if (el.type === 'table') return {};
        const twips = pixelsToTwips(px);
        if (el.type === 'table-cell') {
          return { margins: { left: twips } };
        }
        return { indent: { left: twips } };
      },
      paddingLeft: (v: string, el: DocumentElement) => {
        if (el.type === 'table') return {};
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
        if (el.type === 'table') return {};
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
        if (el.type === 'table') return {};
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
        if (el.type === 'table') return {};
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

  private expandShorthands(
    rawStyles: Partial<Record<keyof CSS.Properties, string | number>>
  ) {
    const mappedStyles: Partial<Record<keyof CSS.Properties, string | number>> =
      { ...rawStyles };

    expandBorderShorthands(mappedStyles);

    return mappedStyles;
  }

  // Method to map raw styles to a generic style object
  public mapStyles(
    rawStyles: Partial<Record<keyof CSS.Properties, string | number>>,
    el: DocumentElement
  ): Record<string, unknown> {
    const expandedStyles = this.expandShorthands(rawStyles);
    return (Object.keys(expandedStyles) as (keyof CSS.Properties)[]).reduce(
      (acc, cssProp) => {
        const mapper = this.mappings[cssProp];
        if (mapper && typeof expandedStyles[cssProp] === 'string') {
          const newStyle = mapper(expandedStyles[cssProp], el) as object;
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
