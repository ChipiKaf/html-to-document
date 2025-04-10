import { DocumentElement, TagHandler } from '../core';
import * as colornames from 'colornames';
import { BorderStyle } from 'docx';

export function parseStyles(element: any): Record<string, string> {
  const styleString =
    typeof element.getAttribute === 'function'
      ? element.getAttribute('style')
      : '';
  const styles: Record<string, string> = {};

  if (styleString) {
    styleString.split(';').forEach((rule: string) => {
      const [prop, value] = rule.split(':');
      if (prop && value) {
        // Convert kebab-case to camelCase
        const camelCaseProp = prop
          .trim()
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        styles[camelCaseProp] = value.trim();
      }
    });
  }
  return styles;
}

export function parseAttributes(element: any): Record<string, string> {
  if (!(typeof element.attributes === 'object')) return {};
  const attributes: Record<string, string> = {};
  for (const attr of Array.from((element as HTMLElement).attributes)) {
    if (attr.name === 'style') continue;
    if (attr.name === 'colspan') continue;
    if (attr.name === 'rowspan') continue;
    attributes[attr.name] = attr.value;
  }
  return attributes;
}

export const colorConversion = (color: string) => {
  if (color.includes('#')) {
    return color.replace('#', '');
  }

  return colornames.get(color)?.value?.replace('#', '') || '000';
};

export function pixelsToTwips(pixels: number): number {
  return Math.round(pixels * 15); // 1px = 15 twips (approx)
}

export function mapBorderStyle(style: string): string {
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
      return BorderStyle.SINGLE; // No direct mapping, using solid as fallback
    default:
      return BorderStyle.SINGLE;
  }
}
