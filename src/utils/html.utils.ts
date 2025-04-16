import colornames from 'colornames';

import { BorderStyle } from 'docx';

export function parseStyles(
  element: HTMLElement
): Record<string, string | number> {
  const styleString = element.getAttribute('style') || '';
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

export function parseAttributes(
  element: HTMLElement
): Record<string, string | number> {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'style') continue;
    if (attr.name === 'colspan') continue;
    if (attr.name === 'rowspan') continue;
    attributes[attr.name] = attr.value;
  }
  return attributes;
}

export function colorConversion(color: string): string {
  const v = color.trim().toLowerCase();

  // 1) If it comes in as a hex already, just strip the “#”
  if (/^#?[0-9a-f]{6}$/i.test(v)) {
    return v.replace(/^#/, '').toUpperCase();
  }

  // 2) Ask colornames() for it (this covers all CSS keyword names)
  const hex = colornames(v); // e.g. "#D3D3D3" for "lightgray"
  if (hex) {
    return hex.replace('#', '').toUpperCase();
  }

  // 3) Last resort, black
  return '000000';
}

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
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
