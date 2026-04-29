import { describe, expect, it } from 'vitest';
import { init, IDocumentConverter } from '../../../core/src';
import { JSDOMParser } from '../../../core/__tests__/utils/parser.helper';
import { cssParserPlugin } from '../src';

describe('cssParserPlugin', () => {
  it('adds head and body style tags to the per-parse stylesheet and removes style elements from content', async () => {
    let receivedStylesheet: any;
    let parsedElements: any[] = [];

    class StyleAdapter implements IDocumentConverter {
      async convert(parsed: any, stylesheet?: any): Promise<Buffer> {
        parsedElements = parsed;
        receivedStylesheet = stylesheet;
        return Buffer.from('ok');
      }
    }

    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin()],
      adapters: { register: [{ format: 'style', adapter: StyleAdapter }] },
    });

    const html = [
      '<html>',
      '<head><style>p.note { color: red; } @page { size: A4; }</style></head>',
      '<body><style>.other { font-weight: bold; }</style><p class="note">Hello</p></body>',
      '</html>',
    ].join('');

    const parsed = await converter.parse(html);
    await converter.convert(html, 'style');

    const parsedParagraphs = parsed.filter(
      (element) => element.type === 'paragraph'
    );
    const convertedParagraphs = parsedElements.filter(
      (element) => element.type === 'paragraph'
    );

    expect(parsedParagraphs).toHaveLength(1);
    expect(parsedParagraphs[0]?.text).toBe('Hello');
    expect(convertedParagraphs).toHaveLength(1);
    expect(
      receivedStylesheet.getMatchedStyles(convertedParagraphs[0])
    ).toMatchObject({
      color: 'red',
    });
    expect(receivedStylesheet.getAtRules('page')).toEqual([
      {
        kind: 'at-rule',
        name: 'page',
        prelude: undefined,
        descriptors: { size: 'A4' },
        children: undefined,
      },
    ]);
    expect(
      receivedStylesheet
        .getStatements()
        .some(
          (statement: any) =>
            statement.kind === 'style' && statement.selectors.includes('.other')
        )
    ).toBe(true);
  });

  it('preserves unsupported nested selectors as raw stylesheet statements', async () => {
    let receivedStylesheet: any;

    class StyleAdapter implements IDocumentConverter {
      async convert(_parsed: any, stylesheet?: any): Promise<Buffer> {
        receivedStylesheet = stylesheet;
        return Buffer.from('ok');
      }
    }

    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin()],
      adapters: { register: [{ format: 'style', adapter: StyleAdapter }] },
    });

    await converter.convert(
      '<style>section article p { color: blue; }</style><p>Hello</p>',
      'style'
    );

    expect(receivedStylesheet.getStatements()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'style',
          selectors: ['section article p'],
          declarations: { color: 'blue' },
        }),
      ])
    );
  });

  it('can preserve style elements in document content when removal is disabled', async () => {
    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin({ removeStyleElements: false })],
      adapters: { register: [] },
    });

    const parseState = await converter.parseState(
      '<style>.note { color: red; }</style><p class="note">Hello</p>'
    );

    expect(parseState.document.querySelector('style')?.textContent).toContain(
      '.note { color: red; }'
    );
    expect(
      parseState.elements.some((element) => element.type === 'paragraph')
    ).toBe(true);
  });
});
