import { init } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

describe('e2e tests for init', () => {
  it('should be possible to run init without any error', () => {
    const converter = init({});
    expect(converter).toBeDefined();
  });

  it('should be possible to init with the docx adapter', () => {
    const converter = init({
      adapters: {
        register: [
          {
            adapter: DocxAdapter,
            format: 'docx',
          },
        ],
      },
    });
    expect(converter).toBeDefined();
  });
});
