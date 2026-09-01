/* eslint-disable @typescript-eslint/no-unused-vars */
import colornames from 'colornames';
import { convert, utils } from '@asamuzakjp/css-color';
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
  const parsed = utils.isColor(color) ? convert.colorToHex(color) : null;
  if (parsed) return parsed.slice(1).toUpperCase();

  const v = color.trim().toLowerCase();

  // 1) If it comes in as a 6- or 8-digit hex already, strip the '#'.
  // DOCX color slots are RGB only, so ignore any alpha channel.
  if (/^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) {
    return v.replace(/^#/, '').slice(0, 6).toUpperCase();
  }

  // 2) Expand 3- or 4-digit shorthand hex.
  if (/^#?[0-9a-f]{3}([0-9a-f])?$/i.test(v)) {
    const hex = v.replace(/^#/, '');
    return hex
      .slice(0, 3)
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase();
  }

  // 3) Parse rgb()/rgba() values. Support both legacy comma syntax and
  // modern space-separated syntax with an optional alpha channel after '/'.
  // DOCX does not support alpha here, so drop it.
  const rgbMatch = v.match(/^rgba?\((.+)\)$/i);
  const rgbBody = rgbMatch?.[1]?.trim();
  if (rgbBody) {
    const [channelSection] = rgbBody.split('/').map((part) => part.trim());
    const channels = (
      channelSection?.includes(',')
        ? channelSection.split(',').map((part) => part.trim())
        : channelSection?.split(/\s+/).filter(Boolean)
    )?.slice(0, 3);

    if (channels?.length === 3) {
      const parsed = channels.map((channel) => {
        if (channel.endsWith('%')) {
          const percent = Number(channel.slice(0, -1));
          if (!Number.isFinite(percent)) return null;
          return Math.round((Math.min(100, Math.max(0, percent)) / 100) * 255);
        }

        const value = Number(channel);
        if (!Number.isFinite(value)) return null;
        return Math.round(Math.min(255, Math.max(0, value)));
      });

      if (parsed.every((channel): channel is number => channel !== null)) {
        return parsed
          .map((channel) => channel.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      }
    }
  }

  // 4) Ask colornames() for it (this covers CSS keyword names)
  let hex = colornames(v); // e.g. "#D3D3D3" for "lightgray"
  if (!hex && v.endsWith('gray')) {
    // Support American/British spelling variants
    hex = colornames(v.replace(/gray$/, 'grey'));
  }
  if (hex) {
    return hex.replace('#', '').toUpperCase();
  }

  // 5) Last resort, black
  return '000000';
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
