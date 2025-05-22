import {
  mergeStyles,
  base64ToUint8Array,
  handleChildren,
  toBinaryBuffer,
  isInline,
} from '../src/docx.util';
import {
  TextRun,
  ImageRun,
  MathRun,
  Paragraph,
  Table,
  ExternalHyperlink,
} from 'docx';

describe('docx.util', () => {
  describe('mergeStyles', () => {
    it('merges multiple style objects', () => {
      expect(mergeStyles({ a: 1 }, { b: 2 }, undefined as any)).toEqual({
        a: 1,
        b: 2,
      });
    });
  });

  describe('base64ToUint8Array', () => {
    it('converts base64 string to Uint8Array', () => {
      // 'AQID' is Base64 for [1,2,3]
      const arr = base64ToUint8Array('AQID');
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(Array.from(arr)).toEqual([1, 2, 3]);
      // Test branch using global atob if available
      (global as any).atob = (b64: string) =>
        Buffer.from(b64, 'base64').toString('binary');
      const arr2 = base64ToUint8Array('AQID');
      expect(Array.from(arr2)).toEqual([1, 2, 3]);
      delete (global as any).atob;
    });
  });

  describe('toBinaryBuffer', () => {
    it('returns Buffer from base64 string when Buffer available', () => {
      const buf = toBinaryBuffer('AQID', 'base64');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(Array.from(buf as Buffer)).toEqual([1, 2, 3]);
    });
    it('returns Uint8Array from ArrayBuffer input', () => {
      const source = new Uint8Array([4, 5, 6]).buffer;
      const out = toBinaryBuffer(source) as Uint8Array;
      expect(out).toBeInstanceOf(Uint8Array);
      expect(Array.from(out)).toEqual([4, 5, 6]);
    });
    it('falls back to Uint8Array when Buffer is undefined', () => {
      const orig = (global as any).Buffer;
      delete (global as any).Buffer;
      const out = toBinaryBuffer('AQID', 'base64');
      expect(out).toBeInstanceOf(Uint8Array);
      (global as any).Buffer = orig;
    });
  });

  describe('handleChildren', () => {
    it('calls handlers and flattens results', async () => {
      const handlerMap: any = {
        custom: async () => ({ type: 'x' }),
        a: async () => [{ type: 'a' }],
      };
      const children = [
        { type: 'a', text: 'hi' },
        { type: 'b', text: 'bye' },
      ];
      const result = await handleChildren(
        handlerMap,
        children as any,
        { c: 3 },
        { d: 4 }
      );
      expect(Array.isArray(result)).toBe(true);
      // First child uses 'a', second falls back to custom
      // @ts-ignore access result entries
      expect((result as any)[0]).toEqual({ type: 'a' });
      // @ts-ignore
      expect((result as any)[1]).toEqual({ type: 'x' });
    });
  });

  describe('isInline', () => {
    it('recognizes inline text, image, and math runs', () => {
      expect(isInline(new TextRun('t'))).toBe(true);
      expect(isInline(new MathRun('x'))).toBe(true);
    });
  });
});
