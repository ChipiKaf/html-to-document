import { Converter } from '../src/converter';
import { IDocumentConverter } from '../src';
import { JSDOMParser } from './utils/parser.helper';
import { init } from '../src';
import { IDOMParser } from '../src';
import {
  describe,
  expect,
  it,
  beforeEach,
  vi,
  beforeAll,
  Mock,
  afterAll,
} from 'vitest';

// Suppress console.warn output during converter tests
beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  (console.warn as Mock).mockRestore();
});

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

    it('should add tags.defaultStyles to the stylesheet instead of inlining them', async () => {
      let receivedDependencies: any;
      let parsedElements: any[] = [];

      class StyleAdapter implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependencies = deps;
        }
        async convert(parsed: any): Promise<Buffer> {
          parsedElements = parsed;
          return Buffer.from('style-ok');
        }
      }

      const converter = init({
        tags: {
          defaultStyles: [
            { key: 'p', styles: { color: 'red', fontWeight: 'bold' } },
          ],
          defaultAttributes: [{ key: 'p', attributes: { 'data-test': 'yes' } }],
        },
        domParser: new JSDOMParser(),
        adapters: { register: [{ format: 'style', adapter: StyleAdapter }] },
      });

      const parsed = await converter.parse('<p>Styled</p>');
      expect(parsed[0].styles ?? {}).toEqual({});
      expect(parsed[0].attributes).toMatchObject({ 'data-test': 'yes' });

      await converter.convert('<p>Styled</p>', 'style');
      expect(
        receivedDependencies.stylesheet.getMatchedStyles(parsedElements[0])
      ).toMatchObject({
        color: 'red',
        fontWeight: 'bold',
      });
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

    it('should initialize adapters without a core-owned styleMapper', async () => {
      let receivedDependencies: any;

      class StyleTestAdapter implements IDocumentConverter {
        constructor(dependencies: any) {
          receivedDependencies = dependencies;
        }

        public parsed?: any;
        async convert(parsed: any): Promise<Buffer> {
          this.parsed = parsed;
          return Buffer.from('style-test');
        }
      }
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [{ format: 'style', adapter: StyleTestAdapter }],
        },
      });
      const result = await converter.convert(
        '<p style="color:blue">x</p>',
        'style'
      );

      expect(result.toString()).toBe('style-test');
      expect(receivedDependencies).toEqual({
        defaultStyles: {},
        stylesheet: expect.any(Object),
        styleMeta: expect.any(Object),
      });
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

    it('should seed parser built-ins into adapter stylesheets without embedding them in parsed styles', async () => {
      let receivedDependencies: any;
      let parsedElements: any[] = [];

      class StyleAdapter implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependencies = deps;
        }
        async convert(parsed: any): Promise<Buffer> {
          parsedElements = parsed;
          return Buffer.from('style-ok');
        }
      }

      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [{ format: 'style', adapter: StyleAdapter }],
        },
      });

      await converter.convert('<h1>hi</h1>', 'style');

      expect(
        receivedDependencies.stylesheet.getMatchedStyles(parsedElements[0])
      ).toMatchObject({
        fontSize: '32px',
        fontWeight: 'bold',
      });
      expect(parsedElements[0].styles ?? {}).toEqual({});
    });

    it('should allow register.createAdapter to customize adapter construction', async () => {
      let receivedDependencies: any;

      class StyleAdapter implements IDocumentConverter {
        constructor(dependencies: unknown, _config: unknown) {
          receivedDependencies = dependencies;
        }

        async convert(): Promise<Buffer> {
          return Buffer.from('style-ok');
        }
      }

      const converter = init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [
            {
              format: 'style',
              adapter: StyleAdapter,
              createAdapter: ({ Adapter, dependencies, config, format }) =>
                new Adapter(
                  {
                    ...dependencies,
                    defaultStyles: {
                      ...dependencies.defaultStyles,
                      heading: { color: format === 'style' ? 'red' : 'blue' },
                    },
                    styleMeta: {
                      ...dependencies.styleMeta,
                      color: {
                        ...dependencies.styleMeta?.color,
                        inherits: false,
                      },
                    },
                  },
                  config
                ),
            },
          ],
        },
      });

      await converter.convert('<h1>hi</h1>', 'style');

      expect(receivedDependencies.defaultStyles).toMatchObject({
        heading: { color: 'red' },
      });
      expect(receivedDependencies.styleMeta.color).toMatchObject({
        inherits: false,
      });
    });

    it('should provide fresh dependencies to each register.createAdapter call', async () => {
      const receivedDependencies: any[] = [];

      class AdapterA implements IDocumentConverter {
        constructor(_dependencies: unknown, _config: unknown) {}
        async convert(): Promise<Buffer> {
          return Buffer.from('a');
        }
      }

      class AdapterB implements IDocumentConverter {
        constructor(_dependencies: unknown, _config: unknown) {}
        async convert(): Promise<Buffer> {
          return Buffer.from('b');
        }
      }

      init({
        domParser: new JSDOMParser(),
        adapters: {
          defaultStyles: [
            { format: 'a', styles: { heading: { color: 'blue' } } },
            { format: 'b', styles: { heading: { color: 'green' } } },
          ],
          register: [
            {
              format: 'a',
              adapter: AdapterA,
              createAdapter: ({ Adapter, dependencies, config }) => {
                receivedDependencies.push(dependencies);
                dependencies.defaultStyles!.heading!.color = 'mutated';
                dependencies.styleMeta!.color!.inherits = false;
                dependencies.stylesheet.addRule(
                  '[data-h2d-element-type="heading"]',
                  { color: 'mutated' }
                );
                return new Adapter(dependencies, config);
              },
            },
            {
              format: 'b',
              adapter: AdapterB,
              createAdapter: ({ Adapter, dependencies, config }) => {
                receivedDependencies.push(dependencies);
                return new Adapter(dependencies, config);
              },
            },
          ],
        },
      });

      expect(receivedDependencies).toHaveLength(2);
      expect(receivedDependencies[0]).not.toBe(receivedDependencies[1]);
      expect(receivedDependencies[0].defaultStyles).not.toBe(
        receivedDependencies[1].defaultStyles
      );
      expect(receivedDependencies[0].defaultStyles.heading).not.toBe(
        receivedDependencies[1].defaultStyles.heading
      );
      expect(receivedDependencies[0].styleMeta).not.toBe(
        receivedDependencies[1].styleMeta
      );
      expect(receivedDependencies[0].styleMeta.color).not.toBe(
        receivedDependencies[1].styleMeta.color
      );
      expect(receivedDependencies[0].stylesheet).not.toBe(
        receivedDependencies[1].stylesheet
      );
      expect(receivedDependencies[1].defaultStyles).toMatchObject({
        heading: { color: 'green' },
      });
      expect(receivedDependencies[1].styleMeta.color.inherits).toBe(true);
      expect(
        receivedDependencies[0].stylesheet.getMatchedStyles({ type: 'heading' })
      ).toMatchObject({ color: 'mutated' });
      expect(
        receivedDependencies[1].stylesheet.getMatchedStyles({ type: 'heading' })
      ).toMatchObject({ color: 'green' });
    });

    it('should seed stylesheet rules provided directly to init', async () => {
      let receivedDependencies: any;
      let parsedElements: any[] = [];

      class StyleAdapter implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependencies = deps;
        }
        async convert(parsed: any): Promise<Buffer> {
          parsedElements = parsed;
          return Buffer.from('style-ok');
        }
      }

      const converter = init({
        domParser: new JSDOMParser(),
        stylesheetRules: [
          {
            kind: 'style',
            selectors: ['p.note'],
            declarations: { color: 'green' },
          },
          {
            kind: 'at-rule',
            name: 'page',
            descriptors: { size: 'A4' },
          },
        ],
        adapters: {
          register: [{ format: 'style', adapter: StyleAdapter }],
        },
      });

      await converter.convert('<p class="note">hi</p>', 'style');

      expect(
        receivedDependencies.stylesheet.getMatchedStyles(parsedElements[0])
      ).toMatchObject({ color: 'green' });
      expect(receivedDependencies.stylesheet.getAtRules('page')).toEqual([
        {
          kind: 'at-rule',
          name: 'page',
          descriptors: { size: 'A4' },
          prelude: undefined,
          children: undefined,
        },
      ]);
    });

    it('should give each adapter its own stylesheet instance', () => {
      const receivedDependenciesByFormat: Record<string, any> = {};

      class AdapterA implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependenciesByFormat.a = deps;
        }
        async convert(): Promise<Buffer> {
          return Buffer.from('a');
        }
      }

      class AdapterB implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependenciesByFormat.b = deps;
        }
        async convert(): Promise<Buffer> {
          return Buffer.from('b');
        }
      }

      init({
        domParser: new JSDOMParser(),
        adapters: {
          register: [
            { format: 'a', adapter: AdapterA },
            { format: 'b', adapter: AdapterB },
          ],
          defaultStyles: [
            { format: 'a', styles: { paragraph: { color: 'red' } } },
            { format: 'b', styles: { paragraph: { color: 'blue' } } },
          ],
        },
      });

      expect(receivedDependenciesByFormat.a.stylesheet).not.toBe(
        receivedDependenciesByFormat.b.stylesheet
      );
      expect(
        receivedDependenciesByFormat.a.stylesheet.getMatchedStyles({
          type: 'paragraph',
        })
      ).toMatchObject({ color: 'red' });
      expect(
        receivedDependenciesByFormat.b.stylesheet.getMatchedStyles({
          type: 'paragraph',
        })
      ).toMatchObject({ color: 'blue' });
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
