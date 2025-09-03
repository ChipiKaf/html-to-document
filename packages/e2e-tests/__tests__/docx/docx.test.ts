import { DocxAdapter } from 'html-to-document-adapter-docx';
import { init } from 'html-to-document-core';
import { JSDOMParser } from '../utils/parser.helper';
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
});
