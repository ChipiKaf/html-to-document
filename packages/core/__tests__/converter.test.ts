import { Converter } from '../src/converter';
import { IDocumentConverter } from '../src';
import { JSDOMParser } from './utils/parser.helper';
import { init } from '../src';
import { IDOMParser } from '../src';

class DummyConverter implements IDocumentConverter {
  public parsed?: any;
  async convert(parsed: any): Promise<Buffer> {
    this.parsed = parsed;
    return Buffer.from('dummy-result');
  }
}

describe('Converter initialization', () => {
  describe('Converter', () => {
    let converter: Converter;

    beforeEach(() => {
      converter = new Converter({ domParser: new JSDOMParser() });
    });

    it('throws when no converter registered', async () => {
      await expect(converter.convert('<p>test</p>', 'unknown')).rejects.toThrow(
        'Format not available'
      );
    });

    it('registers and uses a converter to return a Buffer', async () => {
      const adapter = new DummyConverter();
      converter.registerConverter('dummy', adapter);

      const result = await converter.convert('<p>Hello</p>', 'dummy');
      expect(result.toString()).toBe('dummy-result');
      expect(adapter.parsed).toBeDefined();
      expect(adapter.parsed[0].type).toBe('paragraph');
      expect(adapter.parsed[0].text).toBe('Hello');
    });

    it('applies middleware before parsing', async () => {
      const adapter = new DummyConverter();
      converter.registerConverter('dummy', adapter);
      converter.useMiddleware(async (html) => html.replace('Hello', 'Hi'));

      await converter.convert('<p>Hello</p>', 'dummy');
      expect(adapter.parsed[0].text).toBe('Hi');
    });
  });

  describe('init', () => {
    it('should initialize with custom tagHandlers', async () => {
      const tagHandler = {
        key: 'custom',
        handler: (element: any) => ({ type: 'custom', text: 'custom!' }),
      };
      const converter = init({
        tags: { tagHandlers: [tagHandler] },
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });
      // Test that the parser uses the custom tag handler
      const result = await converter.parse('<custom></custom>');
      expect(result[0].type).toBe('custom');
      expect(result[0].text).toBe('custom!');
    });

    it('should register adapters via adapters.register', async () => {
      class DummyAdapter implements IDocumentConverter {
        public parsed?: any;
        async convert(parsed: any): Promise<Buffer> {
          this.parsed = parsed;
          return Buffer.from('dummy-result');
        }
      }
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [{ format: 'dummy', adapter: DummyAdapter }] },
      });
      // RegisterAdapters is tested via convert
      const result = await converter.convert('<p>hello</p>', 'dummy');
      expect(result.toString()).toBe('dummy-result');
    });

    it('should apply incoming middleware', async () => {
      class DummyAdapter implements IDocumentConverter {
        public parsed?: any;
        async convert(parsed: any): Promise<Buffer> {
          this.parsed = parsed;
          return Buffer.from('dummy-result');
        }
      }
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [{ format: 'dummy', adapter: DummyAdapter }] },
        middleware: [async (html) => html.replace('foo', 'bar')],
      });
      const result = await converter.convert('<p>foo</p>', 'dummy');
      expect(result.toString()).toBe('dummy-result');
      const parsed = await converter.parse('<p>foo</p>');
      expect(parsed[0].text).toBe('bar');
    });

    it('should use defaultStyles and defaultAttributes via tags', async () => {
      const tagHandler = {
        key: 'p',
        handler: (element: any, options: any) => ({
          type: 'paragraph',
          text: element.textContent,
          styles: options.styles,
          attributes: options.attributes,
        }),
      };
      const converter = init({
        tags: {
          tagHandlers: [tagHandler],
          defaultStyles: [
            { key: 'p', styles: { color: 'red', fontWeight: 'bold' } },
          ],
          defaultAttributes: [{ key: 'p', attributes: { 'data-test': 'yes' } }],
        },
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });
      const parsed = await converter.parse('<p>Styled</p>');
      expect(parsed[0].styles).toMatchObject({
        color: 'red',
        fontWeight: 'bold',
      });
      expect(parsed[0].attributes).toMatchObject({ 'data-test': 'yes' });
    });

    it('should register and convert with multiple adapters', async () => {
      class DummyAdapterA implements IDocumentConverter {
        async convert(parsed: any): Promise<Buffer> {
          return Buffer.from('adapter-a');
        }
      }
      class DummyAdapterB implements IDocumentConverter {
        async convert(parsed: any): Promise<Buffer> {
          return Buffer.from('adapter-b');
        }
      }
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [
            { format: 'a', adapter: DummyAdapterA },
            { format: 'b', adapter: DummyAdapterB },
          ],
        },
      });
      const resultA = await converter.convert('<p>hi</p>', 'a');
      const resultB = await converter.convert('<p>hi</p>', 'b');
      expect(resultA.toString()).toBe('adapter-a');
      expect(resultB.toString()).toBe('adapter-b');
    });

    it('should apply styleMappings in adapters', async () => {
      class StyleTestAdapter implements IDocumentConverter {
        public parsed?: any;
        async convert(parsed: any): Promise<Buffer> {
          this.parsed = parsed;
          return Buffer.from('style-test');
        }
      }
      const styleMapping = {
        color: (value: string) => value.toUpperCase(),
      };
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [{ format: 'style', adapter: StyleTestAdapter }],
          styleMappings: [{ format: 'style', handlers: styleMapping }],
        },
      });
      const result = await converter.convert(
        '<p style="color:blue">x</p>',
        'style'
      );
      expect(result.toString()).toBe('style-test');
      // We cannot directly check the styleMapper, but at least no error
    });

    it('should not apply minifyMiddleware if clearMiddleware is true', async () => {
      class DummyAdapter implements IDocumentConverter {
        public parsed?: any;
        async convert(parsed: any): Promise<Buffer> {
          this.parsed = parsed;
          return Buffer.from('dummy-result');
        }
      }
      // minifyMiddleware removes whitespace, so we test by checking that whitespace is preserved
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [{ format: 'dummy', adapter: DummyAdapter }] },
        clearMiddleware: true,
      });
      const html = '<p>   spaced   </p>';
      const parsed = await converter.parse(html);
      expect(parsed[0].text).toContain('   spaced   ');
    });

    it('should use a custom DOM parser', async () => {
      let called = false;
      class CustomParser implements IDOMParser {
        parse(html: string): Document {
          called = true;
          const parser = new JSDOMParser();
          return parser.parse(html);
        }
      }
      const converter = init({
        domParser: new CustomParser(),
        adapters: { register: [] },
      });
      await converter.parse('<p>test</p>');
      expect(called).toBe(true);
    });

    it('should handle empty HTML and unknown tags', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });
      const parsedEmpty = await converter.parse('');
      expect(Array.isArray(parsedEmpty)).toBe(true);
      const parsedUnknown = await converter.parse('<unknown></unknown>');
      expect(Array.isArray(parsedUnknown)).toBe(true);
    });

    it('should ensure adapters receive correct defaultStyles', async () => {
      let receivedStyles: any;
      class StyleAdapter implements IDocumentConverter {
        constructor(deps: any) {
          receivedStyles = deps.defaultStyles;
        }
        async convert(parsed: any): Promise<Buffer> {
          return Buffer.from('style-ok');
        }
      }
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [{ format: 'style', adapter: StyleAdapter }],
          defaultStyles: [
            { format: 'style', styles: { heading: { color: 'blue' } } },
          ],
        },
      });
      await converter.convert('<h1>hi</h1>', 'style');
      expect(receivedStyles).toMatchObject({ heading: { color: 'blue' } });
    });

    it('should allow tagHandlers to override default behavior', async () => {
      const tagHandler = {
        key: 'h1',
        handler: (element: any) => ({
          type: 'heading',
          text: 'OVERRIDDEN',
          level: 1,
        }),
      };
      const converter = init({
        tags: { tagHandlers: [tagHandler] },
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });
      const parsed = await converter.parse('<h1>should not see this</h1>');
      expect(parsed[0].type).toBe('heading');
      expect(parsed[0].text).toBe('OVERRIDDEN');
    });

    it('should return a Converter instance from init', () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });
      expect(converter).toBeInstanceOf(Converter);
    });
  });
});
