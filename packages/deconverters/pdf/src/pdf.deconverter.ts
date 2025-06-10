import {
  DocumentElement,
  IDocumentDeconverter,
  Parser,
  IDOMParser,
} from 'html-to-document-core';
// Dynamically create a DOM parser based on the execution environment so the
// deconverter can run in both Node and the browser.
function createDomParser(): IDOMParser {
  if (typeof window === 'undefined') {
    // Node environment - use jsdom.
    const { JSDOM } = require('jsdom') as typeof import('jsdom');
    return {
      parse(html: string): Document {
        const dom = new JSDOM(html);
        return dom.window.document;
      },
    };
  }

  // Browser environment - rely on DOMParser.
  return {
    parse(html: string): Document {
      return new DOMParser().parseFromString(html, 'text/html');
    },
  };
}

export class PDFDeconverter implements IDocumentDeconverter {
  private _parser: Parser;

  constructor() {
    this._parser = new Parser([], createDomParser());
  }

  async deconvert(file: Buffer | Blob): Promise<DocumentElement[]> {
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file instanceof Blob) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      throw new Error('Unsupported input type');
    }

    const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    const html = data.text
      .split(/\r?\n/) // split on newlines
      .map((l) => `<p>${l.trim()}</p>`)
      .join('');

    return this._parser.parse(html);
  }
}
