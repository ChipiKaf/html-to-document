/* eslint-disable @typescript-eslint/no-unused-vars */
import colornames from 'colornames';

import { BorderStyle } from 'docx';
import { AttributeElement, DocumentElement } from '../types';

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
  let hex = colornames(v); // e.g. "#D3D3D3" for "lightgray"
  if (!hex && v.endsWith('gray')) {
    // Support American/British spelling variants
    hex = colornames(v.replace(/gray$/, 'grey'));
  }
  if (hex) {
    return hex.replace('#', '').toUpperCase();
  }

  // 3) Last resort, black
  return '000000';
}

export function pixelsToTwips(pixels: number): number {
  return Math.round(pixels * 10); // 1px = 15 twips (approx)
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

interface SimpleAttr {
  name: string;
  styles?: Record<string, string | number>;
  attributes?: Record<string, string | number>;
  content?: DocumentElement[];
}

/**
 * Hoist every direct `type==='attribute'` child of `el` into
 * `el.metadata[thatName]`, removing them from `el.content`.
 * - If the wrapper itself contains attribute‑children, flatten
 *   *those* instead (one level deep).
 * - Otherwise serialize the wrapper itself.
 */
export function extractAttributesToMetadata(
  el: DocumentElement
): DocumentElement {
  if (!Array.isArray(el.content)) return el;
  const attributes = el.content.filter(
    (c: DocumentElement) => c.type === 'attribute'
  );
  const content = el.content.filter(
    (c: DocumentElement) => c.type !== 'attribute'
  );
  if (!attributes.length) return el;
  el.metadata = el.metadata ?? {};
  const newObjects: Record<string, Partial<DocumentElement>[]> = {};
  for (const attr of attributes) {
    const wrapper = attr as AttributeElement;
    const key = wrapper.name || '';
    if (!newObjects[key]) newObjects[key] = [];
    const { type, name, ...otherContent } = wrapper;
    const entry: Partial<DocumentElement> = { ...otherContent };
    if (wrapper.content && wrapper.content.length > 0) {
      entry.content = wrapper.content;
    }
    newObjects[key].push(entry);
  }
  el.content = content.length > 0 ? content : undefined;
  el.metadata = {
    ...el.metadata,
    ...newObjects,
  };
  return el;
}

/**
 * Run the above over an entire document tree.
 */
export function extractAllAttributes(
  doc: DocumentElement[]
): DocumentElement[] {
  return doc.map((el) => {
    if (el.type === 'attribute') {
      const wrapper = el as AttributeElement;
      const { type, name, ...otherContent } = wrapper;
      const entry: Partial<DocumentElement> = { ...otherContent };
      if (wrapper.content && wrapper.content.length > 0) {
        entry.content = wrapper.content;
      }
      return {
        ...wrapper,
        metadata: {
          [name || '']: [entry],
        },
        content: undefined,
      } as DocumentElement;
    }
    return extractAttributesToMetadata(el);
  });
}
