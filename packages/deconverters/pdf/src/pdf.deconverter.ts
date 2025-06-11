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

// Runtime‑agnostic flag
const isNode = typeof window === 'undefined';

export class PDFDeconverter implements IDocumentDeconverter {
  private _parser: Parser;

  constructor() {
    this._parser = new Parser([], createDomParser());
  }

  async deconvert(file: Buffer | Blob): Promise<DocumentElement[]> {
    let html = '';

    if (isNode) {
      // ─── Node: use pdf-parse (expects a Buffer) ────────────────────────────────
      const buffer: Buffer = Buffer.isBuffer(file)
        ? (file as Buffer)
        : file instanceof Blob
          ? Buffer.from(await file.arrayBuffer())
          : (() => {
              throw new Error('Unsupported input type in Node environment');
            })();

      const pdfParse = require('pdf-parse') as (
        data: Buffer
      ) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      const text = data.text;

      html = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join('');
    } else {
      // ─── Browser: use pdfjs-dist; expect a Blob/File from <input type="file"> ──
      if (!(file instanceof Blob)) {
        throw new Error(
          'Browser environment expects a Blob (e.g. File object)'
        );
      }

      // Dynamically load PDF‑JS along with its worker and wire them together
      const [{ getDocument, GlobalWorkerOptions, TextLayer }, workerSrcModule] =
        await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          // ?url tells Vite (or webpack) to emit the worker file and give us its URL
          import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
        ]);

      // pdfjs needs to know where the worker lives at runtime
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      GlobalWorkerOptions.workerSrc = workerSrcModule.default as string;

      const uint8Array = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocument(uint8Array).promise;

      const pageHtml: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const container = document.createElement('div');
        const textLayer = new TextLayer({
          textContentSource: page.streamTextContent({
            includeMarkedContent: true,
            disableNormalization: true,
          }),
          container,
          viewport,
        });
        await textLayer.render();
        pageHtml.push(`<section class="page">${container.innerHTML}</section>`);
      }
      html = pageHtml.join('');
    }

    return this._parser.parse(html);
  }
}
