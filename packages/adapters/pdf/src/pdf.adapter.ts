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
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};

  constructor(dependencies: IConverterDependencies) {
    this.docxAdapter = new DocxAdapter(dependencies);
    this._defaultStyles = { ...(dependencies.defaultStyles ?? {}) };
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    try {
      // Step 1: Convert to DOCX using the existing DocxAdapter
      const htmlString = toHtml(elements, this._defaultStyles);
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

  private async insertPageBreaks(html: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const PAGE_HEIGHT = 9 * 96; // letter page minus 1in margins -> px
    const LINE_HEIGHT = 16; // rough text line height in px
    const IMAGE_PADDING = 20; // extra padding for images
    const ELEMENT_MARGIN = 36; // approximate top/bottom margin per block

    const breakBefore: Element[] = [];

    // Pre-measure all images
    const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
    const heights = await Promise.all(imgs.map((i) => this.getImageHeight(i)));
    const imgHeights = new Map<HTMLImageElement, number>();
    imgs.forEach((img, idx) =>
      imgHeights.set(img, heights[idx]! + IMAGE_PADDING)
    );

    let remaining = PAGE_HEIGHT;

    const container =
      doc.body.children.length === 1
        ? (doc.body.firstElementChild as HTMLElement)
        : doc.body;

    const estimateHeight = (element: Element): number => {
      if (element.tagName.toLowerCase() === 'img') {
        return (
          (imgHeights.get(element as HTMLImageElement) || 100) + ELEMENT_MARGIN
        );
      }

      const txt = element.textContent ?? '';
      const lines = Math.ceil(txt.trim().length / 80) || 1;
      let height = lines * LINE_HEIGHT;

      const innerImgs = Array.from(element.querySelectorAll('img'));
      for (const img of innerImgs) {
        height += imgHeights.get(img as HTMLImageElement) || 100;
      }
      height += ELEMENT_MARGIN;

      return height;
    };

    const elements = Array.from(container.children);

    for (const el of elements) {
      if (el.classList.contains('html2pdf__page-break')) {
        remaining = PAGE_HEIGHT;
        continue;
      }

      const elHeight = estimateHeight(el);

      if (elHeight >= remaining) {
        breakBefore.push(el);
        remaining = PAGE_HEIGHT - elHeight;
      } else {
        remaining -= elHeight;
      }

      if (remaining <= 0) {
        remaining = PAGE_HEIGHT;
      }
    }

    breakBefore.forEach((img) => {
      const pageBreak = doc.createElement('div');
      pageBreak.className = 'html2pdf__page-break';
      img.parentNode?.insertBefore(pageBreak, img);
    });

    return doc.body.innerHTML;
  }

  private async convertHtmlInBrowser(html: string): Promise<Blob> {
    try {
      // Pre‑process HTML so each image starts on a fresh page
      const processedHtml = await this.insertPageBreaks(html);

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
