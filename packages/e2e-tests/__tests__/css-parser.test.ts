import {
  IDocumentConverter,
  IStylesheet,
  init,
  StylesheetStatement,
} from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';
import { cssParserPlugin } from 'html-to-document';
import { JSDOMParser, parseDocxDocument } from './utils/parser.helper';
import { describe, expect, it } from 'vitest';

const createDocxConverter = () =>
  init({
    domParser: new JSDOMParser(),
    plugins: [cssParserPlugin()],
    adapters: {
      register: [
        {
          format: 'docx',
          adapter: DocxAdapter,
        },
      ],
    },
  });

const getParagraphRunProps = (documentJson: any) =>
  documentJson['w:document']['w:body']['w:p']['w:r']['w:rPr'] ?? {};

const getParagraphText = (documentJson: any) =>
  documentJson['w:document']['w:body']['w:p']['w:r']['w:t']['#text'];

describe('e2e tests for the css parser plugin', () => {
  it('preserves custom CSS variable keys in adapter-facing stylesheet statements', async () => {
    let receivedStatements: readonly StylesheetStatement[] = [];

    class StyleCaptureAdapter implements IDocumentConverter {
      async convert(
        _parsed: unknown,
        stylesheet?: IStylesheet
      ): Promise<Buffer> {
        receivedStatements = stylesheet?.getStatements() ?? [];
        return Buffer.from('ok');
      }
    }

    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin()],
      adapters: {
        register: [
          {
            format: 'style-capture',
            adapter: StyleCaptureAdapter,
          },
        ],
      },
    });

    await converter.convert(
      '<style>.styled { --brand-color: #3366FF; color: var(--brand-color); }</style><p class="styled">Styled from style tag</p>',
      'style-capture'
    );

    expect(receivedStatements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'style',
          selectors: ['.styled'],
          declarations: {
            '--brand-color': '#3366FF',
            color: 'var(--brand-color)',
          },
        }),
      ])
    );
  });

  it('preserves multi-value @page margin descriptors in adapter-facing stylesheet statements', async () => {
    let receivedStatements: readonly StylesheetStatement[] = [];

    class StyleCaptureAdapter implements IDocumentConverter {
      async convert(
        _parsed: unknown,
        stylesheet?: IStylesheet
      ): Promise<Buffer> {
        receivedStatements = stylesheet?.getStatements() ?? [];
        return Buffer.from('ok');
      }
    }

    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin()],
      adapters: {
        register: [
          {
            format: 'style-capture',
            adapter: StyleCaptureAdapter,
          },
        ],
      },
    });

    await converter.convert(
      '<style>@page { margin: 1cm 2cm; }</style><p>Page margins</p>',
      'style-capture'
    );

    expect(receivedStatements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'at-rule',
          name: 'page',
          descriptors: {
            margin: '1cm 2cm',
          },
        }),
      ])
    );
  });

  it.each([
    ['3 values', '1cm 2cm 3cm'],
    ['4 values', '1cm 2cm 3cm 4cm'],
  ])(
    'preserves @page margin shorthand with %s in adapter-facing stylesheet statements',
    async (_label, margin) => {
      let receivedStatements: readonly StylesheetStatement[] = [];

      class StyleCaptureAdapter implements IDocumentConverter {
        async convert(
          _parsed: unknown,
          stylesheet?: IStylesheet
        ): Promise<Buffer> {
          receivedStatements = stylesheet?.getStatements() ?? [];
          return Buffer.from('ok');
        }
      }

      const converter = init({
        domParser: new JSDOMParser(),
        plugins: [cssParserPlugin()],
        adapters: {
          register: [
            {
              format: 'style-capture',
              adapter: StyleCaptureAdapter,
            },
          ],
        },
      });

      await converter.convert(
        `<style>@page { margin: ${margin}; }</style><p>Hello</p>`,
        'style-capture'
      );

      expect(receivedStatements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'at-rule',
            name: 'page',
            descriptors: { margin },
          }),
        ])
      );
    }
  );

  it('preserves both @page margin shorthand and longhand descriptors in adapter-facing stylesheet statements', async () => {
    let receivedStatements: readonly StylesheetStatement[] = [];

    class StyleCaptureAdapter implements IDocumentConverter {
      async convert(
        _parsed: unknown,
        stylesheet?: IStylesheet
      ): Promise<Buffer> {
        receivedStatements = stylesheet?.getStatements() ?? [];
        return Buffer.from('ok');
      }
    }

    const converter = init({
      domParser: new JSDOMParser(),
      plugins: [cssParserPlugin()],
      adapters: {
        register: [
          {
            format: 'style-capture',
            adapter: StyleCaptureAdapter,
          },
        ],
      },
    });

    await converter.convert(
      [
        '<style>',
        '@page { margin: 1cm 2cm 3cm 4cm; margin-top: 5cm; margin-left: 6cm; }',
        '</style>',
        '<p>Hello</p>',
      ].join(''),
      'style-capture'
    );

    expect(receivedStatements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'at-rule',
          name: 'page',
          descriptors: {
            margin: '1cm 2cm 3cm 4cm',
            marginTop: '5cm',
            marginLeft: '6cm',
          },
        }),
      ])
    );
  });

  it('applies element selector + class + class in specificity and source order', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        'p { font-style: italic; }',
        '.base { text-decoration: underline; color: #3366FF; }',
        '.final { color: #FF3366; font-weight: bold; }',
        '</style>',
        '<p class="base final">Specificity test</p>',
      ].join(''),
      'docx'
    );

    const runProps = getParagraphRunProps(await parseDocxDocument(docx));

    expect(runProps).toHaveProperty('w:i');
    expect(runProps).toHaveProperty('w:b');
    expect(runProps['w:u']['@_w:val']).toBe('single');
    expect(runProps['w:color']['@_w:val']).toBe('FF3366');
  });

  it('applies class + class using source order for conflicting declarations', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        '.first { color: #3366FF; font-style: italic; }',
        '.second { color: #FF3366; font-weight: bold; }',
        '</style>',
        '<p class="first second">Class order test</p>',
      ].join(''),
      'docx'
    );

    const runProps = getParagraphRunProps(await parseDocxDocument(docx));

    expect(runProps).toHaveProperty('w:i');
    expect(runProps).toHaveProperty('w:b');
    expect(runProps['w:color']['@_w:val']).toBe('FF3366');
  });

  it('keeps class styles overriding element selectors even when the element rule comes later', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        '.accent { color: #FF3366; font-weight: bold; }',
        'p { color: #3366FF; font-style: italic; }',
        '</style>',
        '<p class="accent">Class beats element selector</p>',
      ].join(''),
      'docx'
    );

    const runProps = getParagraphRunProps(await parseDocxDocument(docx));

    expect(runProps).toHaveProperty('w:i');
    expect(runProps).toHaveProperty('w:b');
    expect(runProps['w:color']['@_w:val']).toBe('FF3366');
  });

  it('supports grouped selectors parsed from style elements', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        'p, .lead { font-style: italic; }',
        '.lead { color: #3366FF; }',
        '</style>',
        '<p class="lead">Grouped selector test</p>',
      ].join(''),
      'docx'
    );

    const jsonDocument = await parseDocxDocument(docx);
    const runProps = getParagraphRunProps(jsonDocument);

    expect(getParagraphText(jsonDocument)).toBe('Grouped selector test');
    expect(runProps).toHaveProperty('w:i');
    expect(runProps['w:color']['@_w:val']).toBe('3366FF');
  });

  it('keeps inline styles above stylesheet rules', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        '.lead { color: #3366FF; font-style: italic; }',
        '</style>',
        '<p class="lead" style="color: #FF3366; font-weight: bold;">Inline wins</p>',
      ].join(''),
      'docx'
    );

    const runProps = getParagraphRunProps(await parseDocxDocument(docx));

    expect(runProps).toHaveProperty('w:i');
    expect(runProps).toHaveProperty('w:b');
    expect(runProps['w:color']['@_w:val']).toBe('FF3366');
  });

  it('applies multi-value @page margin shorthand through docx conversion', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      '<style>@page { margin: 1cm 2cm; }</style><p>Page margins</p>',
      'docx'
    );

    const documentJson = await parseDocxDocument(docx);
    const sectionProps = documentJson['w:document']['w:body']['w:sectPr'];

    expect(sectionProps['w:pgMar']['@_w:top']).toBe('567');
    expect(sectionProps['w:pgMar']['@_w:right']).toBe('1134');
    expect(sectionProps['w:pgMar']['@_w:bottom']).toBe('567');
    expect(sectionProps['w:pgMar']['@_w:left']).toBe('1134');
  });

  it('lets @page longhand margins override shorthand values through docx conversion', async () => {
    const converter = createDocxConverter();

    const docx = await converter.convert(
      [
        '<style>',
        '@page { margin: 1cm 2cm 3cm 4cm; margin-top: 5cm; margin-left: 6cm; }',
        '</style>',
        '<p>Page margins</p>',
      ].join(''),
      'docx'
    );

    const documentJson = await parseDocxDocument(docx);
    const sectionProps = documentJson['w:document']['w:body']['w:sectPr'];

    expect(sectionProps['w:pgMar']['@_w:top']).toBe('2835');
    expect(sectionProps['w:pgMar']['@_w:right']).toBe('1134');
    expect(sectionProps['w:pgMar']['@_w:bottom']).toBe('1701');
    expect(sectionProps['w:pgMar']['@_w:left']).toBe('3402');
  });
});
