import { StyleMapper } from '../src/style.mapper';
import { DocumentElement } from '../src/types';
import { ShadingType, BorderStyle } from 'docx';
import { pixelsToTwips } from '../src/utils/html.utils';
import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('StyleMapper', () => {
  let mapper: StyleMapper;
  beforeEach(() => {
    mapper = new StyleMapper();
  });

  it('maps basic text styles', () => {
    const el = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ fontFamily: '"Arial", sans-serif' }, el)).toEqual(
      { font: 'Arial' }
    );
    expect(mapper.mapStyles({ fontWeight: 'bold' }, el)).toEqual({
      bold: true,
    });
    expect(mapper.mapStyles({ fontStyle: 'italic' }, el)).toEqual({
      italics: true,
    });
    expect(
      mapper.mapStyles({ textDecoration: 'underline line-through' }, el)
    ).toEqual({ underline: {}, strike: true });
    expect(mapper.mapStyles({ textTransform: 'uppercase' }, el)).toEqual({
      allCaps: true,
    });
    expect(mapper.mapStyles({ textTransform: 'capitalize' }, el)).toEqual({
      smallCaps: true,
    });
  });

  it('maps text alignment and colors', () => {
    const p = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ textAlign: 'center' }, p)).toEqual({
      alignment: 'center',
    });
    expect(mapper.mapStyles({ color: '#ff0000' }, p)).toEqual({
      color: 'FF0000',
    });
    const t = { type: 'table' } as DocumentElement;
    expect(mapper.mapStyles({ textAlign: 'left' }, t)).toEqual({});
    expect(mapper.mapStyles({ backgroundColor: '#00ff00' }, p)).toEqual({
      shading: { type: ShadingType.CLEAR, fill: '00FF00', color: 'auto' },
    });
  });

  it('maps fontSize and lineHeight', () => {
    const el = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ fontSize: '20px' }, el)).toEqual({
      size: Math.round(20 * 1.5),
    });
    expect(mapper.mapStyles({ fontSize: '200%' }, el)).toEqual({
      size: Math.round(16 * (200 / 100) * 1.5),
    });
    expect(mapper.mapStyles({ lineHeight: '2' }, el)).toEqual({
      spacing: { line: Math.round(2 * 240) },
    });
    expect(mapper.mapStyles({ lineHeight: 'abc' }, el)).toEqual({});
  });

  it('parses width and height for image and non-image elements', () => {
    const img = { type: 'image' } as DocumentElement;
    expect(mapper.mapStyles({ width: '10px' }, img)).toEqual({
      transformation: { width: 10 },
    });
    expect(mapper.mapStyles({ height: '2in' }, img)).toEqual({
      transformation: { height: Math.round(2 * 96) },
    });
    expect(mapper.mapStyles({ width: 'abc' }, img)).toEqual({});
    const p = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ width: '1px' }, p)).toHaveProperty('width');
    expect(mapper.mapStyles({ width: '50%' }, p)).toHaveProperty('width');
    expect(mapper.mapStyles({ width: '2in' }, p)).toHaveProperty('width');
    expect(mapper.mapStyles({ width: '3cm' }, p)).toHaveProperty('width');
    expect(mapper.mapStyles({ width: 'abc' }, p)).toEqual({});
    expect(mapper.mapStyles({ height: '1px' }, p)).toHaveProperty('heigth');
    expect(mapper.mapStyles({ height: 'abc' }, p)).toEqual({});
  });

  it('handles float positioning', () => {
    const img = { type: 'image' } as DocumentElement;
    const left = mapper.mapStyles({ float: 'left' }, img);
    expect(left.floating).toBeDefined();
    const p = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ float: 'right' }, p)).toEqual({ align: 'right' });
    expect(mapper.mapStyles({ float: 'none' }, p)).toEqual({});
  });

  it('maps borderSpacing for tables', () => {
    const t = { type: 'table' } as DocumentElement;
    const out = mapper.mapStyles({ borderSpacing: '4px' }, t) as any;
    expect(out.cellSpacing).toEqual({ value: pixelsToTwips(4), type: 'dxa' });
  });

  it('maps padding and margin for table-cell and paragraphs', () => {
    const cell = { type: 'table-cell' } as DocumentElement;
    const pad = mapper.mapStyles({ padding: '2px' }, cell) as any;
    expect(pad.margins).toEqual({
      top: pixelsToTwips(2),
      bottom: pixelsToTwips(2),
      left: pixelsToTwips(2),
      right: pixelsToTwips(2),
    });
    const p = { type: 'paragraph' } as DocumentElement;
    const padP = mapper.mapStyles({ padding: '3px' }, p) as any;
    expect(padP.spacing).toBeDefined();
    expect(padP.indent).toBeDefined();
    const marP = mapper.mapStyles({ margin: '5px' }, p) as any;
    expect(marP.spacing).toBeDefined();
    expect(marP.indent).toBeDefined();
  });

  it('maps listStyleType for bullet and numbering', () => {
    const el = { type: 'paragraph' } as DocumentElement;
    expect(mapper.mapStyles({ listStyleType: 'decimal' }, el)).toEqual({
      numbering: 'decimal',
    });
    expect(mapper.mapStyles({ listStyleType: 'disc' }, el)).toEqual({
      bullet: true,
    });
    expect(mapper.mapStyles({ listStyleType: 'none' }, el)).toEqual({});
  });

  it('allows custom mapping via addMapping and deep merges', () => {
    // @ts-ignore allow custom keys for testing deepMerge functionality
    mapper.addMapping({ custom: (v: string) => ({ foo: v }) } as any);
    expect(
      mapper.mapStyles(
        { custom: 'bar' } as any,
        { type: 'paragraph' } as DocumentElement
      )
    ).toEqual({ foo: 'bar' });
    // @ts-ignore nested mappings for deep merging
    mapper.addMapping({
      nested1: () => ({ a: { x: 1 } }),
      nested2: () => ({ a: { y: 2 } }),
    } as any);
    const merged = mapper.mapStyles(
      { nested1: 'v1', nested2: 'v2' } as any,
      { type: 'paragraph' } as DocumentElement
    ) as any;
    expect(merged.a).toEqual({ x: 1, y: 2 });
  });

  it('maps border and borderWidth for various contexts', () => {
    const img = { type: 'image' } as DocumentElement;
    const br = mapper.mapStyles({ border: '2px dashed #000' }, img) as any;
    expect(br.outline).toBeDefined();
    const cell = { type: 'table-cell' } as DocumentElement;
    const none = mapper.mapStyles({ border: 'none' }, cell) as any;
    expect(none.borders.top.style).toBe(BorderStyle.NONE);
    const t = { type: 'table' } as DocumentElement;
    const bw = mapper.mapStyles({ borderWidth: '2' } as any, t) as any;
    expect(bw.borders).toBeDefined();
    const p = { type: 'paragraph' } as DocumentElement;
    const bwp = mapper.mapStyles({ borderWidth: '2' } as any, p) as any;
    expect(bwp.border).toBeDefined();
  });

  it('executes all mapping functions without throwing', () => {
    const contexts = [
      { type: 'paragraph', styles: {}, attributes: {} },
      { type: 'image', styles: {}, attributes: {} },
      { type: 'table', styles: {}, attributes: {} },
      { type: 'table-cell', styles: {}, attributes: {} },
    ] as DocumentElement[];
    // Execute each mapping function for basic input to cover code paths
    const keys = Object.keys(
      (mapper as any).mappings
    ) as (keyof (typeof mapper)['mappings'])[];
    keys.forEach((key) => {
      contexts.forEach((ctx) => {
        mapper.mapStyles({ [key]: '1px' } as any, ctx);
      });
    });
    expect(keys.length).toBeGreaterThan(0);
  });
});
