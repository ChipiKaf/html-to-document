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

    it('accepts constructor plugins and legacy middleware in order', async () => {
      const converter = new Converter({
        domParser: new JSDOMParser(),
        clearMiddleware: true,
        plugins: [
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hello', 'Hi')),
          },
        ],
        middleware: [async (html) => html.replace('Hi', 'Welcome')],
      });

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed[0].text).toBe('Welcome');
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

    it('should apply plugins.beforeParse during parsing', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hello', 'Hi')),
          },
        ],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed[0].text).toBe('Hi');
    });

    it('should return the full parse state for a parse session', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hello', 'Hi')),
            onDocument: (context) => {
              context.stylesheet.addRule('p', { color: 'red' });
              context.data.tag =
                context.document.body.firstElementChild?.tagName;
            },
          },
        ],
      } as any);

      const state = await converter.parseState('<p>Hello</p>');

      expect(state.originalHtml).toBe('<p>Hello</p>');
      expect(state.html).toBe('<p>Hi</p>');
      expect(state.document.body.querySelector('p')?.textContent).toBe('Hi');
      expect(state.elements[0].text).toBe('Hi');
      expect(state.data).toMatchObject({ tag: 'P' });
      expect(
        state.stylesheet.getMatchedStyles(state.elements[0])
      ).toMatchObject({
        color: 'red',
      });
    });

    it('should run multiple beforeParse plugins in order', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hello', 'Hi')),
          },
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hi', 'Welcome')),
          },
        ],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed[0].text).toBe('Welcome');
    });

    it('should allow plugins and legacy middleware to both transform HTML', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            beforeParse: (context) =>
              context.setHtml(context.html.replace('Hello', 'Hi')),
          },
        ],
        middleware: [async (html) => html.replace('Hi', 'Welcome')],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed[0].text).toBe('Welcome');
    });

    it('should apply the default plugin when enableDefaultPlugins is omitted', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
      });

      const parsed = await converter.parse('<p>   spaced   </p>');
      expect(parsed[0].text).toBe('spaced');
    });

    it('should not apply the default plugin when enableDefaultPlugins is false', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        enableDefaultPlugins: false,
      } as any);

      const parsed = await converter.parse('<p>   spaced   </p>');
      expect(parsed[0].text).toContain('   spaced   ');
    });

    it('should disable default plugins when clearMiddleware is true', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        clearMiddleware: true,
      } as any);

      const parsed = await converter.parse('<p>   spaced   </p>');
      expect(parsed[0].text).toContain('   spaced   ');
    });

    it('should let explicit enableDefaultPlugins override clearMiddleware', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        clearMiddleware: true,
        enableDefaultPlugins: true,
      } as any);

      const parsed = await converter.parse('<p>   spaced   </p>');
      expect(parsed[0].text).toBe('spaced');
    });

    it('should pass parsed DocumentElements to plugins.afterParse', async () => {
      const afterParse = vi.fn();
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [{ afterParse }],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(afterParse).toHaveBeenCalledTimes(1);
      expect(afterParse).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'afterParse',
          html: '<p>Hello</p>',
          document: expect.any(Object),
          elements: parsed,
          replaceElements: expect.any(Function),
        })
      );
    });

    it('should allow plugins.afterParse to replace the parsed DocumentElement array', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            afterParse: (context) => {
              context.replaceElements([
                { type: 'paragraph', text: 'Replaced' },
              ]);
            },
          },
        ],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed).toEqual([{ type: 'paragraph', text: 'Replaced' }]);
    });

    it('should run multiple afterParse plugins in order', async () => {
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            afterParse: (context) => {
              context.replaceElements(
                context.elements.map((element) => ({
                  ...element,
                  text: 'First',
                }))
              );
            },
          },
          {
            afterParse: (context) => {
              context.replaceElements(
                context.elements.map((element) => ({
                  ...element,
                  text: `${element.text}!`,
                }))
              );
            },
          },
        ],
      } as any);

      const parsed = await converter.parse('<p>Hello</p>');
      expect(parsed[0].text).toBe('First!');
    });

    it('should expose a fresh stylesheet before any plugin hooks run', async () => {
      const stylesheets: any[] = [];
      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [] },
        plugins: [
          {
            beforeParse: (context) => {
              stylesheets.push(context.stylesheet);
              context.stylesheet.addRule('p', { color: 'red' });
            },
            afterParse: (context) => {
              stylesheets.push(context.stylesheet);
            },
          },
        ],
      } as any);

      const first = await converter.parse('<p>First</p>');
      const second = await converter.parse('<p>Second</p>');

      expect(stylesheets[0]).toBe(stylesheets[1]);
      expect(stylesheets[2]).toBe(stylesheets[3]);
      expect(stylesheets[0]).not.toBe(stylesheets[2]);
      expect(first[0].text).toBe('First');
      expect(second[0].text).toBe('Second');
    });

    it('should allow plugins.onDocument to inspect the parsed document and stylesheet', async () => {
      const onDocument = vi.fn((context) => {
        expect(
          context.document.head.querySelector('style')?.textContent
        ).toContain('color: red');
        context.stylesheet.addRule('p', { color: 'red' });
      });

      let receivedStylesheet: any;
      let parsedElements: any[] = [];

      class StyleAdapter implements IDocumentConverter {
        async convert(parsed: any, stylesheet?: any): Promise<Buffer> {
          parsedElements = parsed;
          receivedStylesheet = stylesheet;
          return Buffer.from('style-ok');
        }
      }

      const converter = init({
        domParser: new JSDOMParser(),
        adapters: { register: [{ format: 'style', adapter: StyleAdapter }] },
        plugins: [{ onDocument }],
      } as any);

      const parsed = await converter.parse(
        '<html><head><style>p { color: red; }</style></head><body><p>Hello</p></body></html>'
      );
      await converter.convert(
        '<html><head><style>p { color: red; }</style></head><body><p>Hello</p></body></html>',
        'style'
      );

      expect(onDocument).toHaveBeenCalledTimes(2);
      expect(parsed[0].text).toBe('Hello');
      expect(
        receivedStylesheet.getMatchedStyles(parsedElements[0])
      ).toMatchObject({
        color: 'red',
      });
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

    it('should exclude adapter defaultStyles from seeded stylesheet rules when excludeDefaultStyles is true', async () => {
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
        excludeDefaultStyles: true,
        adapters: {
          register: [{ format: 'style', adapter: StyleAdapter }],
          defaultStyles: [
            { format: 'style', styles: { paragraph: { color: 'blue' } } },
          ],
        },
      });

      await converter.convert('<p>hi</p>', 'style');

      expect(receivedDependencies.defaultStyles).toMatchObject({
        paragraph: { color: 'blue' },
      });
      expect(
        receivedDependencies.stylesheet.getMatchedStyles(parsedElements[0])
      ).toEqual({});
    });

    it('should exclude only selected adapter defaultStyles from seeded stylesheet rules', async () => {
      let receivedDependencies: any;

      class StyleAdapter implements IDocumentConverter {
        constructor(deps: any) {
          receivedDependencies = deps;
        }
        async convert(): Promise<Buffer> {
          return Buffer.from('style-ok');
        }
      }

      init({
        domParser: new JSDOMParser(),
        excludeDefaultStyles: { excludedTagNames: ['paragraph'] },
        adapters: {
          register: [{ format: 'style', adapter: StyleAdapter }],
          defaultStyles: [
            {
              format: 'style',
              styles: {
                heading: { color: 'green' },
                paragraph: { color: 'blue' },
              },
            },
          ],
        },
      });

      expect(
        receivedDependencies.stylesheet.getMatchedStyles({ type: 'heading' })
      ).toMatchObject({ color: 'green' });
      expect(
        receivedDependencies.stylesheet.getMatchedStyles({ type: 'paragraph' })
      ).toEqual({});
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
