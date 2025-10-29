import {
  DocumentElement,
  IConverterDependencies,
  IDocumentConverter,
  toHtml,
} from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';
/// <reference types="./pdfkit-standalone" />
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { isNodeEnvironment } from './pdf.util';

// ---- html2pdf.js type helpers -------------------------------------------
type Html2PdfBuilder = {
  set: (opt: Record<string, unknown>) => Html2PdfBuilder;
  from: (src: HTMLElement | string) => Html2PdfBuilder;
  outputPdf: (type: 'blob' | string) => Promise<Blob>;
};

type Html2PdfExport = Html2PdfBuilder | ((...args: never[]) => Html2PdfBuilder);
// Runtime + TS type‑guard to recognise a builder object
function isHtml2PdfBuilder(obj: unknown): obj is Html2PdfBuilder {
  return (
    !!obj &&
    typeof (obj as Html2PdfBuilder).set === 'function' &&
    typeof (obj as Html2PdfBuilder).from === 'function' &&
    typeof (obj as Html2PdfBuilder).outputPdf === 'function'
  );
}
// -----------------------------

export class PDFAdapter implements IDocumentConverter {
  private docxAdapter: DocxAdapter;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};

  constructor(dependencies: IConverterDependencies) {
    this.docxAdapter = new DocxAdapter(dependencies);
    this._defaultStyles = { ...(dependencies.defaultStyles ?? {}) };
  }

  private convertElement(doc: typeof PDFDocument, elements: DocumentElement[]) {
    for (const element of elements) {
      switch (element.type) {
        case 'page': {
          doc.addPage();
          this.convertElement(doc, element.content || []);
          break;
        }
        // case 'heading': {
        //   if (element.text) {
        //     doc.text(element.text);
        //   } else {
        //     this.convertElement(doc, element.content || []);
        //   }
        //   break;
        // }
        case 'text': {
          if (element.text) {
            doc.text(element.text);
          } else {
            this.convertElement(doc, element.content || []);
          }
          break;
        }
        case 'paragraph': {
          if (element.text) {
            doc.text(element.text);
          } else {
            this.convertElement(doc, element.content || []);
          }
          doc.moveDown();
          break;
        }
      }
    }
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    return new Promise((resolve, reject) => {
      const autoFirstPage = elements.length > 0 && elements[0]?.type !== 'page';
      const doc = new PDFDocument({
        autoFirstPage,
      });
      const chunks: any[] = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      doc.on('error', (err) => {
        reject(err);
      });
      doc.on('end', () => {
        // const result = Buffer.concat(chunks);
        // resolve(result);
        if (isNodeEnvironment()) {
          const result = Buffer.concat(chunks);
          console.log('PDFAdapter: resolved buffer:', result);
          resolve(result);
        } else {
          const blob = new Blob(chunks, { type: 'application/pdf' });
          console.log('PDFAdapter: resolved blob:', blob);
          resolve(blob);
        }
      });

      this.convertElement(doc, elements);

      // stream.on('finish', () => {
      //   const blob = stream.toBlob('application/pdf');
      //   resolve(blob);
      // });
      // stream.on('error', (err) => {
      //   reject(err);
      // });
      doc.end();
    });
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  /**
   * Inserts a <div class="html2pdf__page-break"> before an <img> element only
   * when the image would overflow the remaining space on the current page.
   *
   * The calculation is intentionally approximate – we rely on declared height
   * attributes (falling back to a default) and assume a constant line height for
   * text nodes. This ensures images aren't blindly pushed to a new page while
   * avoiding complex layout calculations.
   */
  private async getImageHeight(img: HTMLImageElement): Promise<number> {
    const attrHeight = parseInt(img.getAttribute('height') || '', 10);
    if (!isNaN(attrHeight)) {
      return attrHeight;
    }

    const styleAttr = img.getAttribute('style');
    if (styleAttr) {
      const match = /height\s*:\s*(\d+)/i.exec(styleAttr);
      if (match) {
        return parseInt(match[1]!, 10);
      }
    }

    return await new Promise<number>((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(probe.naturalHeight || 100);
      probe.onerror = () => resolve(100);
      probe.src = img.getAttribute('src') || '';
    });
  }
}
