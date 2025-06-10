import {
  DocumentElement,
  IDocumentDeconverter,
  Parser,
  IDOMParser,
} from 'html-to-document-core';
import { JSDOM } from 'jsdom';

class JSDOMParser implements IDOMParser {
  parse(html: string): Document {
    const dom = new JSDOM(html);
    return dom.window.document;
  }
}

export class PDFDeconverter implements IDocumentDeconverter {
  private _parser: Parser;

  constructor() {
    this._parser = new Parser([], new JSDOMParser());
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
