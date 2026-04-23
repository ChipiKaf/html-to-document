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
