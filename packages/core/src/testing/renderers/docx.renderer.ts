import {
  DocumentRenderer,
  DocumentLayout,
  PositionedElement,
} from '../spatial.types';
import { ElementType } from '../../types';

/**
 * DOCX Document Renderer for extracting spatial layout information
 *
 * This renderer analyzes DOCX documents to extract positioning, styling,
 * and content information for layout comparison testing.
 */
export class DocxRenderer implements DocumentRenderer {
  private static readonly DOCX_SIGNATURE = 'PK'; // ZIP file signature
  private static readonly DOCX_CONTENT_TYPE = '[Content_Types].xml';

  getFormat(): string {
    return 'docx';
  }

  canHandle(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    // Check ZIP signature
    const signature = buffer.toString('ascii', 0, 2);
    if (signature !== DocxRenderer.DOCX_SIGNATURE) return false;

    // Look for DOCX-specific content
    const content = buffer.toString('ascii');
    return (
      content.includes(DocxRenderer.DOCX_CONTENT_TYPE) ||
      content.includes('word/document.xml')
    );
  }

  async extractLayout(buffer: Buffer): Promise<DocumentLayout> {
    try {
      // Import dynamically to avoid bundling issues
      const JSZip = (await import('jszip')).default;
      const { XMLParser } = await import('fast-xml-parser');

      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      if (!documentXml) {
        throw new Error('Invalid DOCX: word/document.xml not found');
      }

      // Parse the XML
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseAttributeValue: true,
      });

      const documentData = parser.parse(documentXml);
      const body = documentData['w:document']['w:body'];

      // Extract styles.xml for style information
      const stylesXml = await zip.file('word/styles.xml')?.async('string');
      // const styles = stylesXml ? parser.parse(stylesXml) : null; // TODO: Use for advanced styling

      // Extract positioned elements
      const elements = await this.extractElementsFromBody(body);

      // Create document layout
      const layout: DocumentLayout = {
        elements,
        pages: [
          {
            width: 595.3, // A4 width in points (210mm)
            height: 841.9, // A4 height in points (297mm)
            margins: {
              top: 72, // 1 inch in points
              right: 72,
              bottom: 72,
              left: 72,
            },
          },
        ],
        metadata: {
          format: 'docx',
          generatedAt: new Date(),
        },
      };

      return layout;
    } catch (error: unknown) {
      throw new Error(
        `Failed to extract DOCX layout: ${(error as Error).message}`
      );
    }
  }

  /**
   * Extract positioned elements from DOCX body
   */
  private async extractElementsFromBody(
    body: unknown
  ): Promise<{ elements: PositionedElement[]; pageCount: number }> {
    const elements: PositionedElement[] = [];
    const DEFAULT_TOP_MARGIN = 72;
    let currentY = DEFAULT_TOP_MARGIN;
    let elementCounter = 0;
    let currentPageIndex = 0;

    // Helper to process different element types
    const processElement = (
      element: unknown,
      type: ElementType,
      pageIdx: number, // Added pageIdx parameter
    ): PositionedElement | null => {
      const id = `element_${elementCounter++}`;

      // Extract text content
      const text = this.extractTextFromElement(
        element as Record<string, unknown>
      );
      if (!text && type !== 'line' && type !== 'image') return null;

      // Extract styling information
      const style = this.extractStyleFromElement(
        element as Record<string, unknown>
      );

      // Calculate approximate positioning and size
      const fontSize = style?.fontSize || 12;
      // Use explicit lineHeight if available and positive, otherwise estimate
      const explicitLineHeight = style?.lineHeight && style.lineHeight > 0 ? style.lineHeight : null;
      const calculatedLineHeight = explicitLineHeight || fontSize * 1.2;

      // Estimate width based on text length and font size
      const charWidth = fontSize * 0.6; // Approximate character width
      const textWidth = text ? text.length * charWidth : 0;
      const width = Math.min(textWidth, 451.3); // Max content width (A4 - margins)

      // Calculate height based on content and line height
      const lines = Math.ceil(textWidth / 451.3) || 1;
      const height = lines * calculatedLineHeight;

      // Determine X position based on alignment
      let x = 72; // Left margin
      if (style?.alignment === 'center') {
        x = (595.3 - width) / 2;
      } else if (style?.alignment === 'right') {
        x = 595.3 - 72 - width; // Right aligned
      }

      const positionedElement: PositionedElement = {
        id,
        position: { x, y: currentY },
        size: { width, height },
        page: pageIdx, // Use passed pageIdx
        style,
        type,
        text,
        metadata: {
          sourceElement: element,
        },
      };

      // Update current Y position for next element
      currentY += height + ((style?.marginBottom as number) || 0);

      return positionedElement;
    };

    // Process paragraphs
    const paragraphs = this.extractArrayElements(body as Record<string, unknown>, 'w:p');
    for (const para of paragraphs) {
      let containsPageBreak = false;
      const runs = this.extractArrayElements(para as Record<string, unknown>, 'w:r');
      for (const run of runs) {
        const breakElements = this.extractArrayElements(run as Record<string, unknown>, 'w:br');
        for (const br of breakElements) {
          if ((br as Record<string, unknown>)['@_w:type'] === 'page') {
            containsPageBreak = true;
            break;
          }
        }
        if (containsPageBreak) break;
      }

      // If the paragraph's primary purpose is a page break (e.g., it's empty),
      // apply the page break effect and skip adding it as a content element.
      const paragraphText = this.extractTextFromElement(para as Record<string, unknown>);
      if (containsPageBreak && paragraphText.trim() === '') {
        currentPageIndex++;
        currentY = DEFAULT_TOP_MARGIN;
        continue; 
      }
      
      // Check if it's a heading
      const pPr = (para as Record<string, unknown>)['w:pPr'] as Record<string, unknown> | undefined;
      const pStyleObj = pPr?.['w:pStyle'] as Record<string, unknown> | undefined;
      const pStyle = pStyleObj?.['@_w:val'] as string | undefined;
      const isHeading = pStyle && typeof pStyle === 'string' && pStyle.toLowerCase().includes('heading');
      const headingLevel = isHeading
        ? parseInt((pStyle as string).replace(/\D/g, '')) || 1
        : 0;

      const element = processElement(para, isHeading ? 'heading' : 'paragraph', currentPageIndex);
      if (element) {
        if (isHeading) {
          element.metadata = { ...element.metadata, level: headingLevel };
        }
        elements.push(element);
      }

      // If a page break was found in a paragraph with content, apply the break *after* this paragraph.
      if (containsPageBreak && paragraphText.trim() !== '') {
        currentPageIndex++;
        currentY = DEFAULT_TOP_MARGIN;
      }
    }

    // Process tables
    const tables = this.extractArrayElements(body as Record<string, unknown>, 'w:tbl');
    for (const table of tables) {
      // TODO: Need to consider page breaks within tables or forcing table to next page if it doesn't fit.
      // For now, tables don't explicitly cause page breaks themselves in this logic.
      const tableElement = processElement(table, 'table', currentPageIndex);
      if (tableElement) {
        elements.push(tableElement);

        // Process table rows and cells
        const rows = this.extractArrayElements(table as Record<string, unknown>, 'w:tr');
        for (const row of rows) {
          const cells = this.extractArrayElements(row as Record<string, unknown>, 'w:tc');
          for (const cell of cells) {
            const cellElement = processElement(cell, 'table-cell', currentPageIndex);
            if (cellElement) {
              elements.push(cellElement);
            }
          }
        }
      }
    }

    return { elements, pageCount: currentPageIndex + 1 };
  }

  /**
   * Extract text content from a DOCX element
   */
  private extractTextFromElement(element: Record<string, unknown>): string {
    const texts: string[] = [];

    const extractText = (obj: unknown): void => {
      if (typeof obj === 'string') {
        texts.push(obj);
        return;
      }

      if (typeof obj !== 'object' || obj === null) return;

      // Handle text runs
      if ((obj as Record<string, unknown>)['w:t']) {
        const textContent = (obj as Record<string, unknown>)['w:t'];
        if (typeof textContent === 'string') {
          texts.push(textContent);
        } else if ((textContent as Record<string, unknown>)['#text']) {
          texts.push((textContent as Record<string, unknown>)['#text'] as string);
        }
      }

      // Recursively search in object properties
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          value.forEach(extractText);
        } else {
          extractText(value);
        }
      }
    };

    extractText(element);
    return texts.join('').trim();
  }

  /**
   * Extract style information from a DOCX element
   */
  private extractStyleFromElement(
    element: Record<string, unknown>
  ): PositionedElement['style'] {
    const style: PositionedElement['style'] = {};

    // Extract paragraph properties
    const pPr = element['w:pPr'] as Record<string, unknown> | undefined;
    if (pPr) {
      // Alignment
      const jc = (pPr['w:jc'] as Record<string, unknown>)?.['@_w:val'];
      if (jc) {
        style.alignment =
          jc === 'both'
            ? 'justify'
            : (jc as 'left' | 'right' | 'center' | 'justify');
      }

      // Spacing
      const spacing = pPr['w:spacing'] as Record<string, unknown> | undefined;
      if (spacing) {
        const before = spacing['@_w:before'] as number | undefined;
        const after = spacing['@_w:after'] as number | undefined;
        const line = spacing['@_w:line'] as number | undefined;
        const lineRule = spacing['@_w:lineRule'] as string | undefined;

        if (before && typeof before === 'number') style.marginTop = this.convertTwipsToPoints(before);
        if (after && typeof after === 'number') style.marginBottom = this.convertTwipsToPoints(after);

        if (line && typeof line === 'number' && lineRule && (lineRule === 'exact' || lineRule === 'atLeast')) {
          style.lineHeight = this.convertTwipsToPoints(line);
        }
      }
    }

    // Extract run properties
    const rPr = ((element['w:r'] as Record<string, unknown>)?.['w:rPr'] || this.findRunProperties(element)) as Record<string, unknown> | null;
    if (rPr) {
      // Font weight
      if (rPr && rPr['w:b'] !== undefined) {
        style.bold = true;
      }

      // Font style
      if (rPr && rPr['w:i'] !== undefined) {
        style.italic = true;
      }

      // Underline
      if (rPr && rPr['w:u']) {
        style.underline = true;
      }

      // Strike-through
      if (rPr && rPr['w:strike']) {
        style.strikethrough = true;
      }

      // Font size
      const sz = rPr && (rPr['w:sz'] as Record<string, unknown>)?.['@_w:val'];
      if (sz && typeof sz === 'string') {
        style.fontSize = parseFloat(sz) / 2; // Convert half-points to points
      }

      // Color
      const color = rPr && (rPr['w:color'] as Record<string, unknown>)?.['@_w:val'];
      if (color && typeof color === 'string' && color !== 'auto') {
        style.color = `#${color}`;
      }

      // Vertical alignment
      const vertAlign = rPr && (rPr['w:vertAlign'] as Record<string, unknown>)?.['@_w:val'];
      if (vertAlign) {
        style.verticalAlign =
          vertAlign === 'subscript'
            ? 'sub'
            : vertAlign === 'superscript'
              ? 'super'
              : 'baseline';
      }
    }

    return style;
  }

  /**
   * Find run properties in nested structure
   */
  private findRunProperties(obj: unknown): Record<string, unknown> | null {
    if (typeof obj !== 'object' || obj === null) return null;

    if ((obj as Record<string, unknown>)['w:rPr']) return (obj as Record<string, unknown>)['w:rPr'] as Record<string, unknown>;

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = this.findRunProperties(item);
          if (found) return found;
        }
      } else {
        const found = this.findRunProperties(value);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Extract array elements handling both array and single element cases
   */
  private extractArrayElements(
    container: Record<string, unknown>,
    elementName: string
  ): unknown[] {
    const elements = container[elementName];
    if (!elements) return [];
    return Array.isArray(elements) ? elements : [elements];
  }

  /**
   * Convert DOCX twips to points
   */
  private convertTwipsToPoints(twips: number): number {
    return twips / 20; // 20 twips = 1 point
  }
}
