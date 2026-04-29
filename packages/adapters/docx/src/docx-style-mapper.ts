import {
  colorConversion,
  DocumentElement,
  Styles,
  parseImageSizePx,
} from 'html-to-document-core';
import { lengthToTwips, parseWidth } from './utils/parse';
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
  ISpacingProperties,
} from 'docx';
import {
  twipsToEighthsOfPoint,
  twipsToEmus,
  twipsToHalfPoints,
} from './utils/unit-conversion';

type StyleKey = keyof Styles;

export type DocxStyleMapping = Partial<
  Record<StyleKey, (value: string, el: DocumentElement) => unknown>
>;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const BASE_FONT_SIZE_PX = 16;

const capitalize = <S extends string>(value: S): Capitalize<S> => {
  // @ts-expect-error - The logic is correct, but TypeScript doesn't understand that the return type is Capitalize<S>
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const borderStyleValues = [
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
] as const;

const mapBorderStyle = (style: string): string => {
  switch (style.toLowerCase()) {
    case 'none':
    case 'hidden':
      return BorderStyle.NONE;
    case 'solid':
      return BorderStyle.SINGLE;
    case 'dashed':
      return BorderStyle.DASHED;
    case 'dotted':
      return BorderStyle.DOTTED;
    case 'double':
      return BorderStyle.DOUBLE;
    case 'groove':
    case 'ridge':
    case 'inset':
    case 'outset':
      return BorderStyle.SINGLE;
    default:
      return BorderStyle.SINGLE;
  }
};

const lengthToBorderSize = (value: string): number | undefined => {
  const twips = lengthToTwips(value);
  return typeof twips === 'number' ? twipsToEighthsOfPoint(twips) : undefined;
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
  justify: 'both', // docx uses “JUSTIFIED”
  justified: 'both',
};

// @To-do: Consider making the conversion from px or any other size extensible
export class DocxStyleMapper {
  protected mappings: DocxStyleMapping = {};

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
          const token = v.trim().split(/\s+/)[0] ?? '';
          const twips = lengthToTwips(token);
          if (typeof twips === 'number') {
            // docx only supports uniform spacing, so use the horizontal value
            return {
              cellSpacing: {
                value: twips,
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
        const decorations = v
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
        const key = v.trim().toLowerCase();
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
        const twips = lengthToTwips(v, { basePx: BASE_FONT_SIZE_PX });
        return typeof twips === 'number'
          ? { size: twipsToHalfPoints(twips) }
          : {};
      },

      // Line height and spacing
      lineHeight: (v, el) => {
        const raw = v.trim().toLowerCase();
        const match = raw.match(/^([+-]?\d*\.?\d+)([a-z%]*)$/);
        if (!match) return {};
        const num = Number(match[1]);
        if (!Number.isFinite(num)) return {};
        const unit = match[2] ?? '';
        if (!unit) {
          return {
            spacing: {
              line: Math.round(num * 240), // 1 = 240 twips, which is single line spacing
              lineRule: 'auto',
            } satisfies ISpacingProperties,
          };
        }
        // TODO: handle '%' unit which is relative to the font size of the original element

        // TODO: get the font size in a better way
        const fontSizeTwips =
          lengthToTwips(el.styles?.fontSize ?? `${BASE_FONT_SIZE_PX}px`, {
            basePx: BASE_FONT_SIZE_PX,
          }) ?? Math.round(BASE_FONT_SIZE_PX * 15);
        const basePx = fontSizeTwips / 15;
        const lineTwips = lengthToTwips(raw, { basePx, unitless: 'none' });
        if (typeof lineTwips !== 'number') return {};

        return {
          spacing: {
            line: lineTwips,
            lineRule: 'exact',
          } satisfies ISpacingProperties,
        };
      },
      width: (v, el) => {
        // For images, map CSS width → ImageRun transformation width
        if (el.type === 'image') {
          const px = parseImageSizePx(v);
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
          const px = parseImageSizePx(v);
          return typeof px === 'number'
            ? ({
                transformation: { height: Math.round(px) },
              } satisfies DeepPartial<IImageOptions>)
            : {};
        }
        if (el.type === 'table-row') {
          const rowHeight = lengthToTwips(v);
          if (typeof rowHeight !== 'number') return {};
          return {
            height: {
              rule: 'exact',
              value: rowHeight,
            },
          } satisfies DeepPartial<ITableRowOptions>;
        }
        const parsed = parseWidth(v);
        return parsed ? { height: parsed } : {};
      },
      minHeight: (v, el) => {
        if (el.type === 'table-row') {
          const rowHeight = lengthToTwips(v);
          if (typeof rowHeight !== 'number') return {};
          return {
            height: {
              rule: 'atLeast',
              value: rowHeight,
            },
          } satisfies DeepPartial<ITableRowOptions>;
        }
        return {};
      },

      letterSpacing: (v) => {
        const twips = lengthToTwips(v);
        return typeof twips === 'number' ? { characterSpacing: twips } : {};
      },
      border: (v: string, el) => {
        const raw = v.trim();
        // For images, map CSS border shorthand to an outline around the picture
        if (el.type === 'image') {
          // expect format: "<width> <style> <color>" (e.g. "2px dashed #333")
          const parts = raw.split(/\s+/);
          const widthPart = parts[0] || '';
          const width = lengthToTwips(widthPart);
          if (typeof width === 'number' && parts.length >= 2) {
            // parse color as last part
            const colorPart = parts.slice(2).join(' ') || (parts[1] ?? '');
            const color = colorConversion(colorPart);
            return {
              outline: {
                width: twipsToEmus(width),
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
        const size = lengthToBorderSize(v);
        return size === undefined
          ? {}
          : el.type === 'table'
            ? {
                borders: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size,
                  },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size,
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size,
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size,
                  },
                },
              }
            : {
                border: {
                  top: { size },
                  bottom: { size },
                  left: { size },
                  right: { size },
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
              `border${capDir}Color` satisfies StyleKey,
              (v: string) => ({
                borders: { [dir]: { color: colorConversion(v) } },
                border: { [dir]: { color: colorConversion(v) } },
              }),
            ],
            [
              `border${capDir}Style` satisfies StyleKey,
              (v: string) => ({
                borders: { [dir]: { style: mapBorderStyle(v) } },
                border: { [dir]: { style: mapBorderStyle(v) } },
              }),
            ],
            [
              `border${capDir}Width` satisfies StyleKey,
              (v: string) => {
                const size = lengthToBorderSize(v);
                return size === undefined
                  ? {}
                  : {
                      borders: { [dir]: { size } },
                      border: { [dir]: { size } },
                    };
              },
            ],
          ];
        })
      ) satisfies DocxStyleMapping),

      padding: (v, el) => {
        if (el.type === 'table') return {};
        const token = v.trim().split(/\s+/)[0] ?? '';
        const twips = lengthToTwips(token);
        if (typeof twips !== 'number') return {};

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
        const raw = v.trim();
        const token = raw.split(/\s+/)[0] ?? '';
        const twips = lengthToTwips(token);
        if (typeof twips !== 'number') return {};
        // Only apply wrap margins if image is floated
        const floatDir = (el.styles as Styles & { float?: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          return {
            floating: {
              wrap: {
                margins: {
                  distL: twips,
                  distR: twips,
                  distT: twips,
                  distB: twips,
                },
              },
            },
          };
        }
        // Tables: ignore
        if (el.type === 'table') return {};
        // Table cells: direct cell margins
        if (el.type === 'table-cell') {
          return {
            margins: { top: twips, bottom: twips, left: twips, right: twips },
          };
        }
        // Paragraphs: spacing + indent
        const before = twips;
        const after = twips;
        const horiz = twips;
        return {
          spacing: { before, after },
          indent: { left: horiz, right: horiz },
        };
      },
      marginTop: (v: string, el: DocumentElement) => {
        const token = v.trim().split(/\s+/)[0] ?? '';
        const twips = lengthToTwips(token);
        if (typeof twips !== 'number') return {};
        // Only apply top wrap margin if image is floated
        const floatDir = (el.styles as Styles & { float?: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          return { floating: { wrap: { margins: { distT: twips } } } };
        }
        if (el.type === 'table') return {};
        if (el.type === 'table-cell') {
          return { margins: { top: twips } };
        }
        return { spacing: { before: twips } };
      },

      marginBottom: (v: string, el: DocumentElement) => {
        const token = v.trim().split(/\s+/)[0] ?? '';
        const twips = lengthToTwips(token);
        if (typeof twips !== 'number') return {};
        // Only apply bottom wrap margin if image is floated
        const floatDir = (el.styles as Styles & { float?: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          return { floating: { wrap: { margins: { distB: twips } } } };
        }
        if (el.type === 'table') return {};
        if (el.type === 'table-cell') {
          return { margins: { bottom: twips } };
        }
        return { spacing: { after: twips } };
      },

      marginLeft: (v: string, el: DocumentElement) => {
        const token = v.trim().split(/\s+/)[0] ?? '';
        const twips = lengthToTwips(token);
        if (typeof twips !== 'number') return {};
        // Only apply left wrap margin if image is floated
        const floatDir = (el.styles as Styles & { float?: string })?.float;
        if (
          el.type === 'image' &&
          (floatDir === 'left' || floatDir === 'right')
        ) {
          return { floating: { wrap: { margins: { distL: twips } } } };
        }
        if (el.type === 'table') return {};
        if (el.type === 'table-cell') {
          return { margins: { left: twips } };
        }
        return { indent: { left: twips } };
      },
      paddingLeft: (v: string, el: DocumentElement) => {
        if (el.type === 'table') return {};
        const token = v.trim().split(/\s+/)[0] ?? '';
        const space = lengthToTwips(token);
        if (typeof space !== 'number') return {};
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
        const token = v.trim().split(/\s+/)[0] ?? '';
        const space = lengthToTwips(token);
        if (typeof space !== 'number') return {};
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
        const token = v.trim().split(/\s+/)[0] ?? '';
        const space = lengthToTwips(token);
        if (typeof space !== 'number') return {};
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
        const token = v.trim().split(/\s+/)[0] ?? '';
        const space = lengthToTwips(token);
        if (typeof space !== 'number') return {};
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
    rawStyles: Partial<Record<StyleKey, string | number>>
  ) {
    const mappedStyles: Partial<Record<StyleKey, string | number>> = {
      ...rawStyles,
    };

    const directions = ['top', 'right', 'bottom', 'left'] as const;
    const capitalizedDirections = directions.map((dir) => capitalize(dir));

    const borderDirections = capitalizedDirections.map(
      (dir) => `border${dir}` satisfies StyleKey
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
      const parts = prop.split(/\s+/).filter(Boolean);
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
      const widthProp = `${borderDir}Width` satisfies StyleKey;
      const styleProp = `${borderDir}Style` satisfies StyleKey;
      const colorProp = `${borderDir}Color` satisfies StyleKey;
      mappedStyles[widthProp] ??= width;
      mappedStyles[styleProp] ??= borderStyleValue;
      mappedStyles[colorProp] ??= color;
    });

    if (mappedStyles.borderWidth) {
      const widthValue = mappedStyles.borderWidth;
      capitalizedDirections.forEach((dir) => {
        const prop = `border${dir}Width` satisfies StyleKey;
        mappedStyles[prop] ??= widthValue;
      });
    }
    if (mappedStyles.borderStyle) {
      const styleValue = mappedStyles.borderStyle;
      capitalizedDirections.forEach((dir) => {
        const prop = `border${dir}Style` satisfies StyleKey;
        mappedStyles[prop] ??= styleValue;
      });
    }
    if (mappedStyles.borderColor) {
      const colorValue = mappedStyles.borderColor;
      capitalizedDirections.forEach((dir) => {
        const prop = `border${dir}Color` satisfies StyleKey;
        mappedStyles[prop] ??= colorValue;
      });
    }

    return mappedStyles;
  }

  // Method to map raw styles to a generic style object
  public mapStyles(
    rawStyles: Partial<Record<StyleKey, string | number>>,
    el: DocumentElement
  ): Record<string, unknown> {
    const expandedStyles = this.expandShorthands(rawStyles);
    return (Object.keys(expandedStyles) as StyleKey[]).reduce(
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
  public addMapping(mappings: DocxStyleMapping): void {
    Object.entries(mappings).forEach((entries) => {
      this.mappings[entries[0] as StyleKey] = entries[1];
    });
  }
}
