import { HtmlAdapter, init } from 'html-to-document';
import { describe, expect, it } from 'vitest';
import { JSDOMParser } from '../utils/parser.helper';

describe('e2e tests using the html adapter', () => {
  it('serializes parsed HTML back into HTML output', async () => {
    const converter = init({
      domParser: new JSDOMParser(),
      adapters: {
        register: [
          {
            format: 'html',
            adapter: HtmlAdapter,
          },
        ],
      },
    });

    const result = await converter.convert(
      '<p>Hello <strong>world</strong></p>',
      'html'
    );

    expect(Buffer.isBuffer(result)).toBe(true);

    const html = (result as Buffer).toString('utf-8');
    expect(html).toContain('<p>Hello <strong>world</strong></p>');
  });
});
