import {
  DocumentElement,
  IConverterDependencies,
  IDocumentConverter,
  toHtml,
} from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

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

  constructor(dependencies: IConverterDependencies) {
    this.docxAdapter = new DocxAdapter(dependencies);
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    try {
      // Step 1: Convert to DOCX using the existing DocxAdapter
      const htmlString = toHtml(elements);
      if (typeof window !== 'undefined') {
        // Browser: feed HTML straight to html2pdf
        return await this.convertHtmlInBrowser(htmlString);
      } else {
        // Node: fall back to DOCX ➜ PDF pathway (unchanged for now)
        const docxResult = await this.docxAdapter.convert(elements);
        return await this.convertInNode(docxResult as Buffer);
      }
    } catch (error) {
      throw new Error(
        `PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async convertInNode(docxBuffer: Buffer): Promise<Buffer> {
    try {
      // Dynamic import for Node.js environment
      const { convert } = await import('libreoffice-convert');
      const { promisify } = await import('util');
      const convertAsync = promisify(convert);

      // Convert DOCX to PDF using libre-office-convert
      const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
      return pdfBuffer as Buffer;
    } catch (error) {
      throw new Error(
        `LibreOffice conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Places an empty <div class="html2pdf__page-break"> immediately before
   * every <img> element so each image begins on a new PDF page.
   */
  private insertPageBreaks(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('img').forEach((img) => {
      const pageBreak = doc.createElement('div');
      pageBreak.className = 'html2pdf__page-break';
      img.parentNode?.insertBefore(pageBreak, img);
    });
    return doc.body.innerHTML;
  }

  private async convertHtmlInBrowser(html: string): Promise<Blob> {
    try {
      // Pre‑process HTML so each image starts on a fresh page
      const processedHtml = this.insertPageBreaks(html);

      const html2pdfModule = (await import('html2pdf.js')) as {
        default?: Html2PdfExport;
      } & Record<string, unknown>;

      const maybeExport = html2pdfModule.default ?? html2pdfModule;

      let builder: Html2PdfBuilder;
      if (typeof maybeExport === 'function') {
        builder = (maybeExport as (...args: never[]) => Html2PdfBuilder)();
      } else if (isHtml2PdfBuilder(maybeExport)) {
        builder = maybeExport;
      } else {
        throw new Error(
          'html2pdf module did not export a callable factory or builder object'
        );
      }
      // wrap HTML string in a container for html2pdf
      const opt = {
        margin: 1,
        filename: 'document.pdf',
        // image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true, // allow cross‑origin images
          allowTaint: false, // keep canvas clean when CORS succeeds
          imageTimeout: 15000, // wait up to 15 s for images
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      const pdfBlob = await builder
        .set(opt)
        .from(processedHtml)
        .outputPdf('blob');
      return pdfBlob as Blob;
    } catch (error) {
      throw new Error(
        `Browser PDF conversion failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
