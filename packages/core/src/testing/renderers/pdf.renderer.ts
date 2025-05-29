import {
  DocumentRenderer,
  DocumentLayout,
  PositionedElement,
} from '../spatial.types';

/**
 * PDF Document Renderer for extracting spatial layout information
 *
 * This renderer analyzes PDF documents to extract positioning, styling,
 * and content information for layout comparison testing.
 */
export class PdfRenderer implements DocumentRenderer {
  private static readonly PDF_SIGNATURE = '%PDF-';

  getFormat(): string {
    return 'pdf';
  }

  canHandle(buffer: Buffer): boolean {
    if (buffer.length < 5) return false;
    return buffer.toString('ascii', 0, 5) === PdfRenderer.PDF_SIGNATURE;
  }

  async extractLayout(buffer: Buffer): Promise<DocumentLayout> {
    try {
      // Import dynamically to avoid bundling issues
      const pdfParse = (await import('pdf-parse')).default;

      const allElements: PositionedElement[] = [];
      const pageDimensions: { width: number; height: number }[] = [];

      // Custom pagerender function to process each page
      const renderPage = async (pageData: any): Promise<PositionedElement[]> => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const pageIndex = pageData.pageInfo.pageIndex;
        const viewport = pageData.pageInfo.view; // [x1, y1, x2, y2]
        const pageWidth = viewport[2] - viewport[0];
        const pageHeight = viewport[3] - viewport[1];
        
        // Store page dimensions
        if (pageIndex >= pageDimensions.length) {
          pageDimensions.length = pageIndex + 1;
        }
        pageDimensions[pageIndex] = { width: pageWidth, height: pageHeight };

        const textContent = await pageData.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });
        
        const pageElements: PositionedElement[] = [];
        textContent.items.forEach((item: any, itemIndex: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const x = item.transform[4];
          // PDF y-coordinate is from bottom-left. Transform to top-left.
          // Assuming item.transform[5] is the y of the bottom-left corner of the text item.
          const y = pageHeight - item.transform[5] - item.height;

          const element: PositionedElement = {
            id: `pdf_page_${pageIndex}_item_${itemIndex}`,
            text: item.str,
            position: { x, y },
            size: { width: item.width, height: item.height },
            page: pageIndex,
            style: {
              fontFamily: item.fontName || undefined,
              fontSize: item.height, // Approximate font size from item height
            },
            type: 'paragraph', // Default to paragraph, can be improved later
            metadata: {
              sourceText: item.str,
            },
          };
          pageElements.push(element);
        });
        return pageElements;
      };

      const options = {
        pagerender: renderPage,
      };

      // Parse the PDF to extract text and basic structure
      const pdfData = await pdfParse(buffer, options);

      // After pdfParse, renderPage will have been called for each page.
      // The elements are collected in the callback, so we need to gather them.
      // This approach assumes renderPage populates a shared array or similar.
      // For this implementation, pdfParse's resolved data doesn't directly contain elements from pagerender.
      // We will process pdfData.text if needed or rely on elements collected by renderPage directly.
      // However, pdf-parse's `pagerender` is more of a side-effect processor.
      // The `pdfData` returned by `pdfParse` will still contain `text`, `numpages`, etc.
      // The `allElements` array needs to be populated by `renderPage`.

      // A slight refactor: `renderPage` will push to `allElements` directly.
      // This is a common pattern when callbacks are used for side effects.
      // Re-defining renderPage to capture `allElements` in its closure.
      const renderPageWithClosure = async (pageData: any): Promise<void> => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const pageIndex = pageData.pageInfo.pageIndex;
        const viewport = pageData.pageInfo.view; // [x1, y1, x2, y2]
        // Make sure viewport is an array with at least 4 elements
        if (!Array.isArray(viewport) || viewport.length < 4) {
            console.warn(`Invalid viewport data for page ${pageIndex}`, viewport);
            // Potentially use a default or last known good page size
            // For now, skip processing this page if viewport is invalid
            return;
        }

        const pageWidth = viewport[2] - viewport[0];
        const pageHeight = viewport[3] - viewport[1];
        
        if (pageIndex >= pageDimensions.length) {
          pageDimensions.length = pageIndex + 1;
        }
        pageDimensions[pageIndex] = { width: pageWidth, height: pageHeight };

        const textContent = await pageData.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });

        // First pass to calculate median item height for the page
        const itemHeights = textContent.items
          .map((item: any) => item.height) // eslint-disable-line @typescript-eslint/no-explicit-any
          .filter((h: number) => h > 0)
          .sort((a: number, b: number) => a - b);
        
        let pageMedianItemHeight = 12; // Default median height
        if (itemHeights.length > 0) {
          const mid = Math.floor(itemHeights.length / 2);
          pageMedianItemHeight = itemHeights.length % 2 !== 0 ? itemHeights[mid] : (itemHeights[mid - 1] + itemHeights[mid]) / 2;
        }
        
        textContent.items.forEach((item: any, itemIndex: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (!item.str || item.str.trim() === '') { // Skip empty items
            return;
          }
          const x = item.transform[4];
          const y = pageHeight - item.transform[5] - item.height;
          
          const inferredTypeResult = this._inferPdfElementType(item, pageMedianItemHeight);

          const element: PositionedElement = {
            id: `pdf_page_${pageIndex}_item_${itemIndex}`,
            text: item.str,
            position: { x, y },
            size: { width: item.width, height: item.height },
            page: pageIndex,
            style: {
              fontFamily: item.fontName !== 'undefined' ? item.fontName : undefined,
              fontSize: item.height, 
              bold: item.fontName && item.fontName.toLowerCase().includes('bold'),
            },
            type: inferredTypeResult.type, 
            metadata: {
              sourceText: item.str,
              ...(inferredTypeResult.level && { headingLevel: inferredTypeResult.level }),
            },
          };
          allElements.push(element);
        });
      };
      
      const optionsWithClosure = {
        pagerender: renderPageWithClosure,
      };
      
      // Re-run pdfParse with the closure-enabled pagerender
      // pdfData will contain general info, allElements will be populated by pagerender
      const parsedPdfData = await pdfParse(buffer, optionsWithClosure);


      // Create document layout
      const layout: DocumentLayout = {
        elements: allElements,
        pages: Array.from({ length: parsedPdfData.numpages }, (_, i) => ({
          width: pageDimensions[i]?.width || 595.3, // A4 width in points (fallback)
          height: pageDimensions[i]?.height || 841.9, // A4 height in points (fallback)
          margins: { // Margins might not be directly available, use defaults
            top: 72, 
            right: 72,
            bottom: 72,
            left: 72,
          },
        })),
        metadata: {
          format: 'pdf',
          generatedAt: new Date(),
          pdfInfo: parsedPdfData.info,
          pages: parsedPdfData.numpages,
        },
      };

      return layout;
    } catch (error: unknown) {
      throw new Error(
        `Failed to extract PDF layout: ${(error as Error).message}`
      );
    }
  }

  private _inferPdfElementType(
    item: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    pageMedianItemHeight: number
  ): { type: PositionedElement['type']; level?: number } {
    let type: PositionedElement['type'] = 'paragraph';
    let level: number | undefined = undefined;

    const itemHeight = item.height;
    const itemText = item.str || '';
    const itemFontName = (item.fontName || '').toLowerCase();

    // Heuristic 1: Significantly larger font size (item.height)
    if (itemHeight > pageMedianItemHeight * 1.8) { // e.g. > 18pt if median is 10pt
      type = 'heading';
      level = 1; // Largest headings
    } else if (itemHeight > pageMedianItemHeight * 1.4) { // e.g. > 14pt if median is 10pt
      type = 'heading';
      level = 2; // Secondary headings
    } else if (itemHeight > pageMedianItemHeight * 1.15) { // e.g. > 11.5pt if median is 10pt
        // Potentially smaller headings or emphasized text. Consider font weight.
        if (itemFontName.includes('bold')) {
            type = 'heading';
            level = 3;
        }
    }
    
    // Heuristic 2: Line length and content for headings (refine if already heading)
    if (type === 'heading') {
      if (itemText.length > 120) { // Very long text is unlikely to be a heading
        type = 'paragraph'; // Revert to paragraph
        level = undefined;
      }
      // Optional: check for lack of punctuation at the end for headings (might be too restrictive)
      // else if (itemText.endsWith('.') || itemText.endsWith(':') || itemText.endsWith(';')) {
      //   type = 'paragraph';
      //   level = undefined;
      // }
    }

    // Heuristic 3: Font weight from font name (if not already a heading by size)
    // This is a weaker signal for 'heading' but can identify bold text.
    // The bold style is now set in the main loop, so this specific check for 'heading' might be redundant
    // unless we want to make 'bold paragraph' a 'heading level 4' or similar.
    // For now, if it's not a heading by size, bold text remains a paragraph with bold style.

    return { type, level };
  }
}
