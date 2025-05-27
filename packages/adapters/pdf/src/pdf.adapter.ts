import {
  DocumentElement,
  IConverterDependencies,
  IDocumentConverter,
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
      const docxResult = await this.docxAdapter.convert(elements);

      // Step 2: Convert DOCX to PDF
      if (typeof window !== 'undefined') {
        // Browser environment - use alternative approach since libre-office-convert is Node-only
        return await this.convertInBrowser(docxResult as Blob);
      } else {
        // Node.js environment - use libre-office-convert
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

  private async convertInBrowser(docxBlob: Blob): Promise<Blob> {
    try {
      // Dynamic imports for browser environment
      const mammoth = await import('mammoth');
      const html2pdfModule = (await import('html2pdf.js')) as {
        default?: Html2PdfExport;
      } & Record<string, unknown>;

      // html2pdf.js can appear in several shapes depending on how it's bundled
      //   1. The module itself *is* the callable factory   -> import('html2pdf.js') returns fn
      //   2. It is the default export                     -> { default: fn }
      //   3. A pre‑built builder object is exported       -> { set, from, outputPdf }
      //   4. The builder object lives under `.default`    -> { default: { set, ... } }
      //
      // We normalise all of these to a *builder* object that has `.set`, `.from`, and `.outputPdf`.
      const maybeExport = html2pdfModule.default ?? html2pdfModule;

      let builder: Html2PdfBuilder;
      if (typeof maybeExport === 'function') {
        // Classic usage: call the factory to obtain the builder chain
        builder = (maybeExport as (...args: never[]) => Html2PdfBuilder)();
      } else if (isHtml2PdfBuilder(maybeExport)) {
        // Already a builder chain
        builder = maybeExport;
      } else {
        throw new Error(
          'html2pdf module did not export a callable factory or builder object'
        );
      }

      // Step 1: Convert DOCX to HTML using mammoth
      const arrayBuffer = await docxBlob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Step 2: Convert HTML to PDF using html2pdf
      const element = document.createElement('div');
      element.innerHTML = html;

      const opt = {
        margin: 1,
        filename: 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      const pdfBlob = await builder.set(opt).from(element).outputPdf('blob');
      return pdfBlob as Blob;
    } catch (error) {
      throw new Error(
        `Browser PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
