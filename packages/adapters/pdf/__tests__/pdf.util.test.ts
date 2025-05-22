import { isInline, handleChildren } from '../src/pdf.util';

describe('pdf.util', () => {
  describe('isInline', () => {
    it('returns true for inline types and false otherwise', () => {
      expect(isInline({ type: 'text', styles: { display: 'inline' } })).toBe(true);
      expect(isInline({ type: 'image', styles: { display: 'inline' } })).toBe(true);
      expect(isInline({ type: 'text', styles: { display: 'block' } })).toBe(false);
      expect(isInline({ type: 'div', styles: { display: 'inline' } })).toBe(false);
    });
  });

  describe('handleChildren', () => {
    it('applies handlers and filters unknown types', async () => {
      const handlers: Record<string, any> = {
        text: async (el: any, styles: any) => ({ t: el.text, foo: styles.foo }),
        image: async (el: any) => `img:${el.src}`,
      };
      const elements = [
        { type: 'text', text: 'hello', styles: { foo: 'bar' } },
        { type: 'image', src: 'url', styles: {} },
        { type: 'other', data: 1, styles: {} },
      ];
      const result = await handleChildren(handlers, elements as any, { foo: 'parent' });
      expect(result).toEqual([
        { t: 'hello', foo: 'bar' },
        'img:url',
      ]);
    });
  });
});