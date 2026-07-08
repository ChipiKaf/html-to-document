import { type DocumentElement } from 'html-to-document-core';
import { afterEach, describe, expect, it } from 'vitest';
import { HtmlAdapter } from '../src/html.adapter';

describe('HtmlAdapter', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('returns a Buffer in Node.js environments', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const adapter = new HtmlAdapter({});
    const elements: DocumentElement[] = [
      {
        type: 'paragraph',
        text: 'Hello HTML',
        styles: {},
        attributes: {},
      },
    ];

    const result = await adapter.convert(elements);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect((result as Buffer).toString('utf-8')).toContain('<p>Hello HTML</p>');
  });

  it('returns a Blob in browser environments', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });

    const adapter = new HtmlAdapter({}, { mimeType: 'text/html' });
    const elements: DocumentElement[] = [
      {
        type: 'paragraph',
        text: 'Hello browser',
        styles: {},
        attributes: {},
      },
    ];

    const result = await adapter.convert(elements);

    expect(result).toBeInstanceOf(Blob);
    expect((result as Blob).type).toBe('text/html');
    await expect((result as Blob).text()).resolves.toContain(
      '<p>Hello browser</p>'
    );
  });

  it('applies dependency default styles during serialization', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const adapter = new HtmlAdapter({
      defaultStyles: {
        paragraph: {
          color: 'red',
          fontWeight: 'bold',
        },
      },
    });

    const elements: DocumentElement[] = [
      {
        type: 'paragraph',
        text: 'Styled paragraph',
        styles: {},
        attributes: {},
      },
    ];

    const result = await adapter.convert(elements);
    const html = (result as Buffer).toString('utf-8');

    expect(html).toContain('style="color: red; font-weight: bold;"');
  });
});
