import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream'; // Only for browser path
import { PassThrough } from 'stream'; // For Node.js path
import {
  DocumentElement,
  ParagraphElement,
  TextElement,
  ImageElement,
  HeadingElement,
  ListElement,
  ListItemElement,
  TableElement,
  // GridCell, // If needed for table processing logic
  LineElement,
  Styles,
  IConverterDependencies,
  StyleMapper,
  IDocumentConverter,
} from 'html-to-document-core';
import { handleChildren, isInline } from './pdf.util';
// Import image-size if you plan to use it for image dimensions
import imageSize from 'image-size';
import fs from 'fs'; // Required by image-size in Node.js, and for local file access for images
import path from 'path'; // For image path processing

// Define a type for PDF rendering options based on styles
type PDFStyleOptions = {
  font?: string;
  fontSize?: number;
  fillColor?: string; // for text color
  strokeColor?: string; // for borders, lines
  lineWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  align?: 'left' | 'center' | 'right' | 'justify';
  valign?: 'top' | 'center' | 'bottom'; // For table cells primarily
  bold?: boolean; // Custom handling as pdfkit might need font switching
  italic?: boolean; // Custom handling
  underline?: boolean;
  strike?: boolean;
  bullet?: boolean | { indent?: number; character?: string }; // For lists
  continued?: boolean; // For text runs that continue on the same line
  link?: string;
  width?: number; // For images, tables
  height?: number; // For images
  // Add more pdfkit specific options as needed
  margins?: { top: number; right: number; bottom: number; left: number };
  textOptions?: any; // To pass directly to pdfkit's text method options
  imageOptions?: any; // To pass directly to pdfkit's image method options
};

// Define a simple style mapping structure for now
// This will need to be significantly expanded
const defaultPDFStyleMap: Record<string, (value: any) => Partial<PDFStyleOptions>> = {
  'color': (value) => ({ fillColor: value }),
  'background-color': (value) => ({ /* PDFKit handles background differently, often per shape */ }),
  'font-size': (value) => ({ fontSize: parseFloat(value) }), // Assuming value is like '12px' or '12pt'
  'font-family': (value) => ({ font: value }), // Basic mapping, pdfkit needs registered fonts
  'font-weight': (value) => ({ bold: value === 'bold' || Number(value) >= 700 }),
  'font-style': (value) => ({ italic: value === 'italic' }),
  'text-decoration': (value) => ({
    underline: value.includes('underline'),
    strike: value.includes('line-through'),
  }),
  'text-align': (value) => ({ align: value as PDFStyleOptions['align'] }),
  'margin-left': (value) => ({ /* Need to handle margins at block level */ }),
  'padding-left': (value) => ({ /* Need to handle padding, pdfkit uses current x,y pos */ }),
  // ... more CSS properties
};

export class PDFAdapter implements IDocumentConverter {
  private _mapper: StyleMapper; // This might need to be a custom PDFStyleMapper
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};
  private doc: typeof PDFDocument | null = null; // Holds the pdfkit document instance

  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    // For now, we'll use a simple style mapping.
    // The provided styleMapper might be for HTML/CSS, we need to adapt it or create a new one for PDF.
    this._mapper = styleMapper; // Or initialize a new PDF specific mapper
    this._defaultStyles = { ...defaultStyles };
  }

  private mapStyles(styles: Styles, element: DocumentElement): PDFStyleOptions {
    const pdfOptions: PDFStyleOptions = {};
    // Use the core StyleMapper first if it can produce generic style objects
    const genericStyles = this._mapper.mapStyles(styles, element);

    for (const key in genericStyles) {
        if (defaultPDFStyleMap[key]) {
            Object.assign(pdfOptions, defaultPDFStyleMap[key](genericStyles[key]));
        } else {
            // Handle direct properties or complex ones
            switch (key) {
                // Example: if genericStyles includes 'bold: true' directly
                case 'bold': pdfOptions.bold = genericStyles[key] as boolean; break;
                case 'italic': pdfOptions.italic = genericStyles[key] as boolean; break;
                // Add more direct mappings or transformations here
            }
        }
    }
    // Apply element-specific styles (e.g. from el.styles)
    // This part is crucial and needs to be robust
    for (const styleKey in styles) {
        if (defaultPDFStyleMap[styleKey]) {
            Object.assign(pdfOptions, defaultPDFStyleMap[styleKey](styles[styleKey]));
        } else {
             switch (styleKey) {
                case 'fontWeight': pdfOptions.bold = styles[styleKey] === 'bold' || Number(styles[styleKey]) >= 700; break;
                case 'fontStyle': pdfOptions.italic = styles[styleKey] === 'italic'; break;
                // Add more direct mappings or transformations here
            }
        }
    }
    return pdfOptions;
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    this.doc = new PDFDocument({
      autoFirstPage: true,
    });

    for (const el of elements) {
      await this.convertElement(el, {});
    }

    if (typeof window !== 'undefined') {
      const bs = blobStream();
      this.doc!.pipe(bs); // Non-null assertion
      this.doc!.end();   // Non-null assertion
      return new Promise((resolve, reject) => {
        bs.on('finish', () => resolve(bs.toBlob('application/pdf')));
        bs.on('error', reject);
      });
    } else {
      // Node.js path
      const pt = new PassThrough();
      const buffers: Buffer[] = [];
      pt.on('data', (chunk) => buffers.push(chunk));
      
      return new Promise((resolve, reject) => {
        pt.on('end', () => resolve(Buffer.concat(buffers)));
        pt.on('error', reject); // Catch errors on the PassThrough stream
        this.doc!.on('error', reject); // Non-null assertion

        this.doc!.pipe(pt);   // Non-null assertion
        this.doc!.end();      // Non-null assertion
      });
    }
  }

  private async convertElement(el: DocumentElement, parentStyles: Styles): Promise<void> {
    if (!this.doc) return;

    const mergedStyles = { ...this._defaultStyles?.[el.type], ...parentStyles, ...el.styles };
    const pdfStyles = this.mapStyles(mergedStyles, el);

    // Apply common styles like font, size, color before specific element rendering
    if (pdfStyles.font) this.doc.font(pdfStyles.font); // Make sure font is registered
    if (pdfStyles.fontSize) this.doc.fontSize(pdfStyles.fontSize);
    if (pdfStyles.fillColor) this.doc.fillColor(pdfStyles.fillColor);
    // pdfStyles.strokeColor, pdfStyles.lineWidth etc. might be used by specific handlers

    switch (el.type) {
      case 'paragraph':
        await this.convertParagraph(el as ParagraphElement, pdfStyles, mergedStyles);
        break;
      case 'heading':
        await this.convertHeading(el as HeadingElement, pdfStyles, mergedStyles);
        break;
      case 'list':
        await this.convertList(el as ListElement, pdfStyles, mergedStyles);
        break;
      case 'line':
        await this.convertLine(el as LineElement, pdfStyles, mergedStyles);
        break;
      case 'image':
        await this.convertImage(el as ImageElement, pdfStyles, mergedStyles);
        break;
      case 'table':
        // Table conversion is complex, will need significant work
        await this.convertTable(el as TableElement, pdfStyles, mergedStyles);
        break;
      case 'text':
        // This case might be mostly handled within paragraphs/headings
        await this.convertText(el as TextElement, pdfStyles, mergedStyles, false);
        break;
      default:
        console.warn(`PDFAdapter: Unsupported element type: ${el.type}`);
        // Fallback to paragraph-like rendering for unknown custom elements
        if ((el as any).text || (el as any).content) {
            await this.convertParagraph(el as ParagraphElement, pdfStyles, mergedStyles);
        }
    }
  }

  private async convertParagraph(el: ParagraphElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc) return;
    // For paragraphs, styles like alignment are applied to the text options
    const textOptions: any = {
        align: pdfStyles.align || 'left',
        // continued: false, // Handled by convertText
        underline: pdfStyles.underline,
        strike: pdfStyles.strike,
        link: pdfStyles.link,
    };
    if (el.content && el.content.length > 0) {
        let firstInLine = true;
        for (const contentElement of el.content) {
            const contentStyles = { ...rawStyles, ...contentElement.styles };
            const contentPdfStyles = this.mapStyles(contentStyles, contentElement);
            await this.convertText(contentElement as TextElement, contentPdfStyles, contentStyles, !firstInLine);
            firstInLine = false; // Subsequent texts are continued
        }
        // Add a line break after the paragraph content, unless it's the last element or followed by non-text
         this.doc.moveDown(0.5); // Spacing after paragraph
    } else if (el.text) {
        this.doc.text(el.text, textOptions);
    } else {
        // Empty paragraph, add some vertical space
        this.doc.moveDown(0.5);
    }
  }

  private async convertHeading(el: HeadingElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc) return;
    const level = el.level || 1;
    // Example: Adjust font size based on heading level
    const baseFontFamily = pdfStyles.font || 'Helvetica'; // Base font for this heading, before bold/italic variants
    const baseFontSize = pdfStyles.fontSize || 12;      // Base size for this heading
    const baseFillColor = pdfStyles.fillColor || (this._defaultStyles?.text?.color as string) || 'black'; // Base color

    const headingFontSize = baseFontSize + (6 - level) * 2; // Simple scaling

    // Font selection for the heading block
    let currentHeadingFont = baseFontFamily;
    if (pdfStyles.bold && pdfStyles.italic) {
        currentHeadingFont = 'Helvetica-BoldOblique';
    } else if (pdfStyles.bold) {
        currentHeadingFont = 'Helvetica-Bold';
    } else if (pdfStyles.italic) {
        currentHeadingFont = 'Helvetica-Oblique';
    }
    
    this.doc.font(currentHeadingFont).fontSize(headingFontSize).fillColor(baseFillColor);

    const textOptions: any = { align: pdfStyles.align || 'left' };
    if (pdfStyles.underline) textOptions.underline = true;
    if (pdfStyles.strike) textOptions.strike = true;
    if (pdfStyles.link) textOptions.link = pdfStyles.link;
    // Font, fontSize, and fillColor are set on the doc instance directly.
    // Bold/italic are handled by font selection.

    if (el.content && el.content.length > 0) {
        let firstInLine = true;
        for (const contentElement of el.content) {
            const contentStyles = { ...rawStyles, ...contentElement.styles }; // Merge styles
            const contentPdfStyles = this.mapStyles(contentStyles, contentElement); // Map to PDF options

            // `convertText` will set its own font, size, color based on `contentPdfStyles`.
            // It's important that `convertText` correctly handles `pdfStyles.font` if present,
            // or defaults to Helvetica variants for bold/italic.
            await this.convertText(contentElement as TextElement, contentPdfStyles, contentStyles, !firstInLine);
            
            // After `convertText` (which might change doc's font/size/color),
            // ensure the main heading's font/size/color are reapplied for any subsequent text segments
            // *if those segments are not TextElements with their own specific styling*.
            // However, el.content are all DocumentElements, so convertText handles each.
            // The main heading font/size/color should be set once before the loop if there's no mixed styling.
            // If mixed styling is needed inside a heading (e.g. "Normal **Bold** Normal"),
            // then `el.content` should contain multiple TextElements, and `convertText` handles each.
            // For now, we assume `convertText` correctly applies its given `contentPdfStyles`.
            // We just need to ensure the main heading font is active before the loop if there's no `el.text`.
            // The current structure is: set heading font, loop calls convertText (which sets its own font), then reset.
            // This is mostly fine. The explicit reset to `currentHeadingFont` inside the loop might be redundant
            // if `convertText` is the last thing for that `contentElement`.

            firstInLine = false;
        }
        this.doc.moveDown(0.5); // Spacing after all content of the heading
    } else if (el.text) {
        // If there's only el.text, the font/size/color set before this block is used.
        this.doc.text(el.text, textOptions);
        this.doc.moveDown(0.5); // Spacing after text
    }

    // Reset font, size, and color to what they were before this heading element,
    // or to document defaults to prevent style bleeding.
    // Use the values captured at the start of the *parent* element's processing,
    // or sensible defaults. For now, use `baseFontFamily`, `baseFontSize`, `baseFillColor`
    // which were derived from this heading's `pdfStyles` or defaults.
    // A more robust system might pass down the "current document state" to be restored.
    this.doc.font(baseFontFamily) // Reset to the non-bold/italic family from pdfStyles or Helvetica
             .fontSize(baseFontSize)   // Reset to the size from pdfStyles or 12
             .fillColor(baseFillColor); // Reset to color from pdfStyles or default (black)
    this.doc.moveDown(0.5); // Spacing after heading, as per example
  }

  private async convertText(el: TextElement, pdfStyles: PDFStyleOptions, rawStyles: Styles, continued: boolean): Promise<void> {
    if (!this.doc || !el.text) return;

    // Handle font variations (bold, italic)
    // pdfkit requires switching fonts for bold/italic unless using a registered font family with styles
    let font = pdfStyles.font || 'Helvetica';
    if (pdfStyles.bold && pdfStyles.italic) {
        font = 'Helvetica-BoldOblique';
    } else if (pdfStyles.bold) {
        font = 'Helvetica-Bold';
    } else if (pdfStyles.italic) {
        font = 'Helvetica-Oblique';
    }
    this.doc.font(font);

    if (pdfStyles.fontSize) this.doc.fontSize(pdfStyles.fontSize);
    if (pdfStyles.fillColor) this.doc.fillColor(pdfStyles.fillColor);

    const textOptions: any = {
      continued: continued,
      underline: pdfStyles.underline,
      strike: pdfStyles.strike,
      link: (el.attributes?.href as string) || pdfStyles.link,
      // features: [] // For OpenType features if needed
    };
    // Apply raw element styles that might not have been mapped yet
    // e.g. el.styles.color
    if(el.styles?.color) this.doc.fillColor(el.styles.color as string);


    this.doc.text(el.text, textOptions);
  }

  private async convertList(el: ListElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc) return;
    this.doc.moveDown(0.5); // Space before list
    for (const item of el.content as ListItemElement[]) {
      // Determine bullet character or number
      const bullet = el.listType === 'ordered' ? `${(item.metadata?.order || 1)}. ` : '- ';
      // ListItemElement might have its own content (nested elements) or just text
      const itemStyles = { ...rawStyles, ...item.styles };
      const itemPdfStyles = this.mapStyles(itemStyles, item);

      if (item.content && item.content.length > 0) {
          // Handle complex list items with nested content
          // This part needs careful x,y positioning or using pdfkit's list/item features
          this.doc.text(bullet, { continued: true, ...itemPdfStyles.textOptions }); // Render bullet
          // Render item content. This might involve recursive calls or specific text handling
          let firstInLine = true;
          for (const contentEl of item.content) {
              const contentStyles = { ...itemStyles, ...contentEl.styles };
              const contentPdfStyles = this.mapStyles(contentStyles, contentEl);
              // Pass 'continued: !firstInLine' if it's text
              await this.convertText(contentEl as TextElement, contentPdfStyles, contentStyles, !firstInLine);
              firstInLine = false;
          }
          this.doc.moveDown(0.25);
      } else if (item.text) {
        this.doc.text(bullet + item.text, { ...itemPdfStyles.textOptions, continued: false });
      }
    }
    this.doc.moveDown(0.5); // Space after list
  }

  private async convertLine(el: LineElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc) return;
    this.doc.moveDown(0.5); // Space before line
    this.doc
      .strokeColor(pdfStyles.strokeColor || '#000000')
      .lineWidth(pdfStyles.lineWidth || 1)
      .moveTo(this.doc.page.margins.left, this.doc.y)
      .lineTo(this.doc.page.width - this.doc.page.margins.right, this.doc.y)
      .stroke();
    this.doc.moveDown(0.5); // Space after line
  }

  private async convertImage(el: ImageElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc || !el.src) return;

    let dataBuffer: Buffer | Uint8Array | undefined;
    let imgDimensions = { width: pdfStyles.width || 100, height: pdfStyles.height || 100 }; // Default/fallback

    try {
      const src = el.src;
      if (src.startsWith('data:')) {
        const matches = src.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
        if (!matches || matches.length < 3) throw new Error('Invalid data URI');
        dataBuffer = Buffer.from(matches[2], 'base64');
      } else if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Failed to fetch image from ${src}`);
        const arrayBuffer = await response.arrayBuffer();
        dataBuffer = Buffer.from(arrayBuffer);
      } else if (typeof window === 'undefined') { // Node.js local file
        const imagePath = path.resolve(src); // Ensure path is absolute or resolved correctly
        if (!fs.existsSync(imagePath)) throw new Error(`File not found: ${imagePath}`);
        dataBuffer = fs.readFileSync(imagePath);
      }

      if (dataBuffer) {
        // Try to get dimensions using image-size
        // image-size expects Buffer in Node.js
        const dimensions = imageSize(dataBuffer as Buffer);
        if (dimensions.width && dimensions.height) {
            imgDimensions = { width: dimensions.width * 0.75, height: dimensions.height * 0.75 }; // PDF points (72 DPI)
        }
      }
    } catch (error) {
      console.error('Error loading image for PDF:', error);
      // Optionally, render a placeholder or skip
      return;
    }

    if (dataBuffer) {
      const imageOptions: any = {
        fit: [imgDimensions.width, imgDimensions.height], // Example: fit within a 100x100 box
        align: pdfStyles.align || 'left',
        ...pdfStyles.imageOptions, // Allow overriding with specific image options
      };
      if(el.styles?.width) imageOptions.width = parseFloat(el.styles.width as string);
      if(el.styles?.height) imageOptions.height = parseFloat(el.styles.height as string);

      this.doc.image(dataBuffer as Buffer, imageOptions);
      this.doc.moveDown(0.5);
    }
  }

  private async convertTable(el: TableElement, pdfStyles: PDFStyleOptions, rawStyles: Styles): Promise<void> {
    if (!this.doc) return;
    // Basic table implementation placeholder
    // pdfkit has some table support but it can be manual for complex tables.
    // For a simple approach: iterate rows and cells, draw text and borders.
    // More advanced: use a library like 'pdfkit-table' or implement layout logic.

    this.doc.moveDown(0.5);
    const tableTopY = this.doc.y;
    const { rows } = el;
    const columnCount = rows[0]?.cells.length || 1; // Assume all rows have same number of cells for simplicity
    const pageMargin = this.doc.page.margins.left + this.doc.page.margins.right;
    const availableWidth = this.doc.page.width - pageMargin;
    const defaultColWidth = availableWidth / columnCount;

    // Calculate column widths (very basic, can be improved with colgroup/col metadata)
    const colWidths: number[] = Array(columnCount).fill(defaultColWidth);


    let currentX = this.doc.page.margins.left;
    let currentY = tableTopY;
    const rowHeights: number[] = [];

    // First pass: determine row heights (max cell height in a row)
    for (const row of rows) {
        let maxCellHeight = 0;
        currentX = this.doc.page.margins.left;
        for (let i = 0; i < row.cells.length; i++) {
            const cell = row.cells[i];
            const cellText = cell.text || (cell.content?.map(c => (c as TextElement).text).join(' ') || '');
            const cellStyles = { ...rawStyles, ...row.styles, ...cell.styles };
            const cellPdfStyles = this.mapStyles(cellStyles, cell);

            // Simulate text rendering to get height
            this.doc.font(cellPdfStyles.font || 'Helvetica')
                    .fontSize(cellPdfStyles.fontSize || 10);
            const textHeight = this.doc.heightOfString(cellText, { width: colWidths[i] - 10, align: cellPdfStyles.align }); // 10 for padding
            maxCellHeight = Math.max(maxCellHeight, textHeight + 10); // 10 for padding
        }
        rowHeights.push(maxCellHeight);
    }


    // Second pass: draw cells and text
    currentY = tableTopY;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowHeight = rowHeights[i];
        currentX = this.doc.page.margins.left;

        for (let j = 0; j < row.cells.length; j++) {
            const cell = row.cells[j];
            const cellText = cell.text || (cell.content?.map(c => (c as TextElement).text).join(' ') || '');
            const cellStyles = { ...rawStyles, ...row.styles, ...cell.styles };
            const cellPdfStyles = this.mapStyles(cellStyles, cell);

            // Draw cell border
            this.doc.rect(currentX, currentY, colWidths[j], rowHeight).stroke(cellPdfStyles.strokeColor || '#000');

            // Apply cell styles and draw text
             this.doc.font(cellPdfStyles.font || 'Helvetica')
                    .fontSize(cellPdfStyles.fontSize || 10)
                    .fillColor(cellPdfStyles.fillColor || '#000');

            // Handle cell content (basic text for now)
            if (cell.content && cell.content.length > 0) {
                // Simplified: just join text of content elements. Real impl needs recursive conversion.
                let cellContentX = currentX + 5; // 5 for padding
                let cellContentY = currentY + 5;
                let firstInLine = true;
                for(const contentEl of cell.content) {
                    const contentElStyles = { ...cellStyles, ...contentEl.styles};
                    const contentElPdfStyles = this.mapStyles(contentElStyles, contentEl);
                     this.doc.font(contentElPdfStyles.font || 'Helvetica')
                        .fontSize(contentElPdfStyles.fontSize || 10)
                        .fillColor(contentElPdfStyles.fillColor || '#000');
                    this.doc.text((contentEl as TextElement).text || '', cellContentX, cellContentY, {
                        width: colWidths[j] - 10, // padding
                        height: rowHeight - 10,
                        align: contentElPdfStyles.align || 'left',
                        continued: !firstInLine,
                        // valign: cellPdfStyles.valign || 'top', // pdfkit text options for valign
                    });
                    // This simple text addition won't correctly flow or position multiple elements in a cell
                    // A proper implementation would manage y position within the cell or use nested structures
                    firstInLine = false;
                    // For now, just move Y down for next potential text run, crude.
                    // cellContentY += this.doc.heightOfString((contentEl as TextElement).text || '', {width: colWidths[j] -10});
                }

            } else if (cell.text) {
                 this.doc.text(cell.text, currentX + 5, currentY + 5, { // 5 for padding
                    width: colWidths[j] - 10,
                    height: rowHeight - 10,
                    align: cellPdfStyles.align || 'left',
                    // valign: cellPdfStyles.valign || 'top',
                });
            }
            currentX += colWidths[j];
        }
        currentY += rowHeight;
    }
    this.doc.y = currentY; // Update document's y position
    this.doc.moveDown(0.5);
  }
}
