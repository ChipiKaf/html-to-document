import { BorderStyle } from 'docx';
import {
  parseStyles,
  parseAttributes,
  colorConversion,
  pixelsToTwips,
  mapBorderStyle,
  extractAttributesToMetadata,
  extractAllAttributes,
} from '../src/utils/html.utils';
import { DocumentElement } from '../src/types';
import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('html.utils', () => {
  describe('parseStyles', () => {
    it('parses style string into object', () => {
      const element = {
        getAttribute: () => 'color: red; font-size: 16px; ',
      } as any;
      expect(parseStyles(element as HTMLElement)).toEqual({
        color: 'red',
        fontSize: '16px',
      });
    });
    it('returns empty object when no style attribute', () => {
      const element = { getAttribute: () => null } as any;
      expect(parseStyles(element as HTMLElement)).toEqual({});
    });
  });

  describe('parseAttributes', () => {
    it('parses attributes excluding style, colspan, and rowspan', () => {
      const attrs = [
        { name: 'href', value: 'https://example.com' },
        { name: 'style', value: 'ignored' },
        { name: 'colspan', value: '2' },
        { name: 'rowspan', value: '3' },
        { name: 'data-custom', value: 'value' },
      ];
      const element = { attributes: attrs } as any;
      expect(parseAttributes(element as HTMLElement)).toEqual({
        href: 'https://example.com',
        'data-custom': 'value',
      });
    });
  });

  describe('colorConversion', () => {
    it('converts hex colors to uppercase without #', () => {
      expect(colorConversion('#aabbcc')).toBe('AABBCC');
      expect(colorConversion('ddeeff')).toBe('DDEEFF');
    });
    it('converts named colors using colornames', () => {
      expect(colorConversion('red')).toBe('FF0000');
      expect(colorConversion('lightgray')).toBe('D3D3D3');
    });
    it('falls back to black on unknown color', () => {
      expect(colorConversion('notacolor')).toBe('000000');
    });
  });

  describe('pixelsToTwips', () => {
    it('converts pixels to twips', () => {
      expect(pixelsToTwips(5)).toBe(50);
      expect(pixelsToTwips(0)).toBe(0);
    });
  });

  describe('mapBorderStyle', () => {
    it('maps CSS border styles to BorderStyle', () => {
      expect(mapBorderStyle('none')).toBe(BorderStyle.NONE);
      expect(mapBorderStyle('hidden')).toBe(BorderStyle.NONE);
      expect(mapBorderStyle('solid')).toBe(BorderStyle.SINGLE);
      expect(mapBorderStyle('dashed')).toBe(BorderStyle.DASHED);
      expect(mapBorderStyle('dotted')).toBe(BorderStyle.DOTTED);
      expect(mapBorderStyle('double')).toBe(BorderStyle.DOUBLE);
      expect(mapBorderStyle('groove')).toBe(BorderStyle.SINGLE);
      expect(mapBorderStyle('unknown')).toBe(BorderStyle.SINGLE);
    });
  });

  describe('extractAttributesToMetadata', () => {
    it('extracts attribute children into metadata and removes them from content', () => {
      const element: DocumentElement = {
        type: 'fragment',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'attribute', name: 'foo', text: 'bar' },
        ],
      } as any;
      const result = extractAttributesToMetadata(element);
      expect(result.metadata).toEqual({ foo: [{ text: 'bar' }] });
      expect(result.content).toEqual([{ type: 'text', text: 'Hello' }]);
    });
    it('flattens nested attribute wrapper', () => {
      const element: DocumentElement = {
        type: 'fragment',
        content: [
          {
            type: 'attribute',
            name: 'foo',
            content: [{ type: 'text', text: 'nested' }],
          },
        ],
      } as any;
      const result = extractAttributesToMetadata(element);
      expect(result.metadata).toEqual({
        foo: [{ content: [{ type: 'text', text: 'nested' }] }],
      });
      expect(result.content).toBeUndefined();
    });
    it('returns element unchanged when no attributes present', () => {
      const element: DocumentElement = { type: 'text', text: 'plain' } as any;
      expect(extractAttributesToMetadata(element)).toBe(element);
    });
  });

  describe('extractAllAttributes', () => {
    it('applies extractAttributesToMetadata to all elements', () => {
      const arr = [
        { type: 'text', text: 'x' },
        { type: 'attribute', name: 'foo', text: 'b' },
      ] as any[];
      const result = extractAllAttributes(arr as DocumentElement[]);
      expect(Array.isArray(result)).toBe(true);
      expect(result[1].metadata).toEqual({ foo: [{ text: 'b' }] });
    });
  });
});
