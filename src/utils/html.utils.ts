/* eslint-disable @typescript-eslint/no-unused-vars */
import colornames from 'colornames';

import { BorderStyle } from 'docx';
import { AttributeElement, DocumentElement } from '../core';

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

/**
 * Walks a DocumentElement tree and “lifts” any
 * AttributeElement nodes out of `content` into
 * `liftedAttributes[name]`, preserving their payload
 * (everything except `type` and `name`).
 */

export function liftAttributesIntoMetadata(
  el: DocumentElement
): DocumentElement {
  // 1) nothing to do if there's no content
  if (!Array.isArray(el.content)) {
    return el;
  }

  // 2) ensure metadata exists
  el.metadata = el.metadata ?? {};

  // 3) we'll collect all lifted entries here
  const met = el.metadata as Record<string, unknown>;
  const newContent: DocumentElement[] = [];

  for (const child of el.content) {
    if (child.type === 'attribute' && (child as AttributeElement).name) {
      const name = (child as AttributeElement).name!;

      // init the bucket if needed
      if (!Array.isArray(met[name])) {
        met[name] = [];
      }

      const wrapper = child as AttributeElement;
      if (Array.isArray(wrapper.content)) {
        // pull each inner node into metadata[name]
        for (const inner of wrapper.content) {
          if (
            inner.type === 'attribute' &&
            (inner as AttributeElement).name === name &&
            Array.isArray((inner as AttributeElement).content)
          ) {
            // one deeper
            met[name] = [
              ...(met[name] as DocumentElement[]),
              ...(inner as AttributeElement).content!,
            ];
          } else {
            met[name] = [...(met[name] as DocumentElement[]), inner];
          }
        }
      }
      // note: we do NOT push wrapper itself into newContent
    } else {
      // keep non-attribute children, and recurse
      newContent.push(liftAttributesIntoMetadata(child));
    }
  }

  el.content = newContent;

  // if metadata[name] is empty, you can choose to delete it:
  for (const key of Object.keys(met)) {
    if (
      Array.isArray(met[key]) &&
      (met[key] as DocumentElement[]).length === 0
    ) {
      delete met[key];
    }
  }

  // if metadata became empty, you can drop it entirely:
  if (Object.keys(met).length === 0) {
    delete el.metadata;
  }

  return el;
}

export function liftAttributesInDocToMetadata(
  doc: DocumentElement[]
): DocumentElement[] {
  return doc.map(liftAttributesIntoMetadata);
}
/**
 * Apply liftAttributes to every element in a parsed DocumentElement[].
 */
export function liftAttributesInDoc(doc: DocumentElement[]): DocumentElement[] {
  return doc.map(liftAttributesIntoMetadata);
}
