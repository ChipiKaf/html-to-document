import { DocxAdapter } from 'html-to-document-adapter-docx';
import { init } from 'html-to-document-core';
import { JSDOMParser, parseDocxDocument } from '../utils/parser.helper';
import { describe, it, expect } from 'vitest';

describe('e2e tests using the docx adapter', () => {
  const converter = init({
    domParser: new JSDOMParser(),
    adapters: {
      register: [
        {
          format: 'docx',
          adapter: DocxAdapter,
        },
      ],
    },
  });

  describe('inline tags', () => {
    it('<b> produces a bold text run', async () => {
      const docx = await converter.convert('<p>Hello <b>world</b></p>', 'docx');
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const boldRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(boldRun['w:rPr']).toHaveProperty('w:b');
    });

    it('<i> produces an italic text run', async () => {
      const docx = await converter.convert('<p>Hello <i>world</i></p>', 'docx');
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const italicRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(italicRun['w:rPr']).toHaveProperty('w:i');
    });

    it('<strong> produces a bold text run', async () => {
      const docx = await converter.convert(
        '<p>Hello <strong>world</strong></p>',
        'docx'
      );
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const boldRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(boldRun['w:rPr']).toHaveProperty('w:b');
    });

    it('<em> produces an italic text run', async () => {
      const docx = await converter.convert(
        '<p>Hello <em>world</em></p>',
        'docx'
      );
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const italicRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(italicRun['w:rPr']).toHaveProperty('w:i');
    });

    it('<u> produces an underlined text run', async () => {
      const docx = await converter.convert('<p>Hello <u>world</u></p>', 'docx');
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const underlineRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(underlineRun['w:rPr']['w:u']['@_w:val']).toBe('single');
    });

    it('<s> produces a strikethrough text run', async () => {
      const docx = await converter.convert('<p>Hello <s>world</s></p>', 'docx');
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const strikeRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(strikeRun['w:rPr']).toHaveProperty('w:strike');
    });

    it('<b><i> nested tags produce both bold and italic run', async () => {
      const docx = await converter.convert(
        '<p>Hello <b><i>world</i></b></p>',
        'docx'
      );
      const json = await parseDocxDocument(docx);
      const runs = json['w:document']['w:body']['w:p']['w:r'];
      const targetRun = Array.isArray(runs)
        ? runs.find((r: any) => r['w:t']?.['#text'] === 'world')
        : runs;
      expect(targetRun['w:rPr']).toHaveProperty('w:b');
      expect(targetRun['w:rPr']).toHaveProperty('w:i');
    });
  });

  it('should be able to convert a simple HTML to docx', async () => {
    const html = `<p>Hello <strong>World</strong></p>`;
    const docx = await converter.convert(html, 'docx');
    expect(docx).toBeDefined();
    // expect(docx).toContain('Hello World'); // Simplified check
  });

  it('applies adapter defaultStyles after they are seeded into the stylesheet', async () => {
    const styledConverter = init({
      domParser: new JSDOMParser(),
      adapters: {
        register: [
          {
            format: 'docx',
            adapter: DocxAdapter,
          },
        ],
        defaultStyles: [
          {
            format: 'docx',
            styles: {
              paragraph: {
                fontWeight: 'bold',
                color: '#3366FF',
              },
            },
          },
        ],
      },
    });

    const docx = await styledConverter.convert(
      '<p>Seeded paragraph</p>',
      'docx'
    );
    const jsonDocument = await parseDocxDocument(docx);
    const paragraph = jsonDocument['w:document']['w:body']['w:p'];
    const runProps = paragraph['w:r']['w:rPr'];

    // TODO: this may fail once moved to docx default document styles
    expect(paragraph['w:r']['w:t']['#text']).toBe('Seeded paragraph');
    expect(runProps).toHaveProperty('w:b');
    expect(runProps).toHaveProperty('w:bCs');
    expect(runProps['w:color']['@_w:val']).toBe('3366FF');
  });
});
