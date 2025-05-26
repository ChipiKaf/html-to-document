import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  StandardFonts,
  PageSizes,
  TextAlignment,
  LineCapStyle,
  PDFImage,
} from 'pdf-lib';
import {
  DocumentElement,
  ParagraphElement,
  TextElement,
  ImageElement,
  HeadingElement,
  ListElement,
  ListItemElement,
  TableElement,
  LineElement,
  Styles,
  IConverterDependencies,
  StyleMapper,
  IDocumentConverter,
} from 'html-to-document-core';
// Utility functions are available if needed later
import fs from 'fs';
import path from 'path';

// Define a type for PDF rendering options based on styles
type PDFStyleOptions = {
  font?: StandardFonts;
  fontSize?: number;
  fillColor?: { r: number; g: number; b: number }; // RGB color for text
  backgroundColor?: { r: number; g: number; b: number }; // RGB color for background
  strokeColor?: { r: number; g: number; b: number }; // RGB color for borders, lines
  lineWidth?: number;
  lineCap?: LineCapStyle;
  align?: TextAlignment;
  valign?: 'top' | 'center' | 'bottom'; // For table cells primarily
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  bullet?: boolean | { indent?: number; character?: string }; // For lists
  continued?: boolean;
  link?: string;
  width?: number; // For images, tables
  height?: number; // For images
  margins?: { top: number; right: number; bottom: number; left: number };
  padding?: { top: number; right: number; bottom: number; left: number };
};

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 }; // Default to black
};

// Helper function to convert named colors to RGB
const namedColorToRgb = (
  color: string
): { r: number; g: number; b: number } => {
  const colors: Record<string, { r: number; g: number; b: number }> = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 1, g: 1, b: 1 },
    red: { r: 1, g: 0, b: 0 },
    green: { r: 0, g: 1, b: 0 },
    blue: { r: 0, g: 0, b: 1 },
    // Add more as needed
  };
  return colors[color.toLowerCase()] || { r: 0, g: 0, b: 0 };
};

// Helper function to parse color values
const parseColor = (value: string): { r: number; g: number; b: number } => {
  if (value.startsWith('#')) {
    return hexToRgb(value);
  } else if (value.startsWith('rgb')) {
    // Parse rgb(r, g, b) format
    const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
      };
    }
  }
  return namedColorToRgb(value);
};

// Define a simple style mapping structure for pdf-lib
const defaultPDFStyleMap: Record<
  string,
  (value: unknown) => Partial<PDFStyleOptions>
> = {
  color: (value) => ({ fillColor: parseColor(String(value)) }),
  'background-color': (value) => ({
    backgroundColor: parseColor(String(value)),
  }),
  'font-size': (value) => ({ fontSize: parseFloat(String(value)) }),
  'font-family': () => ({
    font: StandardFonts.Helvetica, // Default to Helvetica, can be enhanced
  }),
  'font-weight': (value) => ({
    bold: value === 'bold' || Number(value) >= 700,
  }),
  'font-style': (value) => ({ italic: value === 'italic' }),
  'text-decoration': (value) => {
    const decoration = String(value);
    return {
      underline: decoration.includes('underline'),
      strike: decoration.includes('line-through'),
    };
  },
  'text-align': (value) => {
    const alignMap: Record<string, TextAlignment> = {
      left: TextAlignment.Left,
      center: TextAlignment.Center,
      right: TextAlignment.Right,
      justify: TextAlignment.Center, // pdf-lib doesn't have Justified, use Center as fallback
    };
    return { align: alignMap[String(value)] || TextAlignment.Left };
  },
  'margin-left': () => ({
    /* Need to handle margins at block level */
  }),
  'padding-left': () => ({
    /* Need to handle padding */
  }),
};

export class PDFAdapter implements IDocumentConverter {
  private _mapper: StyleMapper;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};
  private doc: PDFDocument | null = null;
  private page: PDFPage | null = null;
  private currentY: number = 0;
  private pageMargin = 50;
  private lineHeight = 20;
  private fonts: Map<string, PDFFont> = new Map();

  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    this._mapper = styleMapper;
    this._defaultStyles = { ...defaultStyles };
  }

  private mapStyles(styles: Styles, element: DocumentElement): PDFStyleOptions {
    const pdfOptions: PDFStyleOptions = {
      font: StandardFonts.Helvetica,
      fontSize: 12,
      fillColor: { r: 0, g: 0, b: 0 },
      align: TextAlignment.Left,
    };

    // Use the core StyleMapper first if it can produce generic style objects
    const genericStyles = this._mapper.mapStyles(styles, element);

    for (const key in genericStyles) {
      if (defaultPDFStyleMap[key]) {
        Object.assign(pdfOptions, defaultPDFStyleMap[key](genericStyles[key]));
      } else {
        // Handle direct properties or complex ones
        switch (key) {
          case 'bold':
            pdfOptions.bold = genericStyles[key] as boolean;
            break;
          case 'italic':
            pdfOptions.italic = genericStyles[key] as boolean;
            break;
        }
      }
    }

    // Apply element-specific styles
    for (const styleKey in styles) {
      if (defaultPDFStyleMap[styleKey]) {
        Object.assign(
          pdfOptions,
          defaultPDFStyleMap[styleKey](styles[styleKey])
        );
      } else {
        switch (styleKey) {
          case 'fontWeight':
            pdfOptions.bold =
              styles[styleKey] === 'bold' || Number(styles[styleKey]) >= 700;
            break;
          case 'fontStyle':
            pdfOptions.italic = styles[styleKey] === 'italic';
            break;
          case 'fontSize':
            pdfOptions.fontSize = parseFloat(styles[styleKey] as string);
            break;
          case 'color':
            pdfOptions.fillColor = parseColor(styles[styleKey] as string);
            break;
          case 'textAlign':
            const alignMap: Record<string, TextAlignment> = {
              left: TextAlignment.Left,
              center: TextAlignment.Center,
              right: TextAlignment.Right,
              justify: TextAlignment.Center, // pdf-lib doesn't have Justified, use Center as fallback
            };
            pdfOptions.align =
              alignMap[styles[styleKey] as string] || TextAlignment.Left;
            break;
          case 'textDecoration':
            const decoration = styles[styleKey] as string;
            pdfOptions.underline = decoration.includes('underline');
            pdfOptions.strike = decoration.includes('line-through');
            break;
          case 'backgroundColor':
            pdfOptions.backgroundColor = parseColor(styles[styleKey] as string);
            break;
          case 'verticalAlign':
            const vertAlign = styles[styleKey] as string;
            pdfOptions.subscript = vertAlign === 'sub';
            pdfOptions.superscript = vertAlign === 'super';
            break;
          case 'marginTop':
          case 'marginBottom':
          case 'marginLeft':
          case 'marginRight':
            if (!pdfOptions.margins) {
              pdfOptions.margins = { top: 0, right: 0, bottom: 0, left: 0 };
            }
            const marginValue = parseFloat(styles[styleKey] as string) || 0;
            switch (styleKey) {
              case 'marginTop':
                pdfOptions.margins.top = marginValue;
                break;
              case 'marginBottom':
                pdfOptions.margins.bottom = marginValue;
                break;
              case 'marginLeft':
                pdfOptions.margins.left = marginValue;
                break;
              case 'marginRight':
                pdfOptions.margins.right = marginValue;
                break;
            }
            break;
        }
      }
    }

    // Determine font based on bold and italic
    if (pdfOptions.bold && pdfOptions.italic) {
      pdfOptions.font = StandardFonts.HelveticaBoldOblique;
    } else if (pdfOptions.bold) {
      pdfOptions.font = StandardFonts.HelveticaBold;
    } else if (pdfOptions.italic) {
      pdfOptions.font = StandardFonts.HelveticaOblique;
    } else {
      pdfOptions.font = StandardFonts.Helvetica;
    }

    return pdfOptions;
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    this.doc = await PDFDocument.create();
    this.page = this.doc.addPage(PageSizes.A4);
    this.currentY = this.page.getHeight() - this.pageMargin;

    // Load standard fonts
    await this.loadFonts();

    for (const el of elements) {
      await this.convertElement(el, {});
    }

    const pdfBytes = await this.doc.save();

    if (typeof window !== 'undefined') {
      return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    } else {
      return Buffer.from(pdfBytes);
    }
  }

  private async loadFonts(): Promise<void> {
    if (!this.doc) return;

    const fontTypes = [
      StandardFonts.Helvetica,
      StandardFonts.HelveticaBold,
      StandardFonts.HelveticaOblique,
      StandardFonts.HelveticaBoldOblique,
    ];

    for (const fontType of fontTypes) {
      const font = await this.doc.embedFont(fontType);
      this.fonts.set(fontType, font);
    }
  }

  private checkPageSpace(requiredHeight: number): void {
    if (!this.page || !this.doc) return;

    if (this.currentY - requiredHeight < this.pageMargin) {
      this.page = this.doc.addPage(PageSizes.A4);
      this.currentY = this.page.getHeight() - this.pageMargin;
    }
  }

  private async convertElement(
    el: DocumentElement,
    parentStyles: Styles
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...parentStyles,
      ...el.styles,
    };
    const pdfStyles = this.mapStyles(mergedStyles, el);

    switch (el.type) {
      case 'paragraph':
        await this.convertParagraph(el as ParagraphElement, pdfStyles);
        break;
      case 'heading':
        await this.convertHeading(el as HeadingElement, pdfStyles);
        break;
      case 'list':
        await this.convertList(el as ListElement, pdfStyles, mergedStyles);
        break;
      case 'line':
        await this.convertLine(el as LineElement, pdfStyles);
        break;
      case 'image':
        await this.convertImage(el as ImageElement, pdfStyles);
        break;
      case 'table':
        await this.convertTable(el as TableElement, pdfStyles, mergedStyles);
        break;
      case 'text':
        await this.convertText(el as TextElement, pdfStyles);
        break;
      default:
        console.warn(`PDFAdapter: Unsupported element type: ${el.type}`);
        if ('text' in el || 'content' in el) {
          await this.convertParagraph(el as ParagraphElement, pdfStyles);
        }
    }
  }

  private async convertParagraph(
    el: ParagraphElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    this.checkPageSpace(this.lineHeight * 2);

    // Apply margins if specified
    if (pdfStyles.margins?.top) {
      this.currentY -= pdfStyles.margins.top;
    }

    if (el.content && el.content.length > 0) {
      // Handle multiple text runs with different styles
      let currentX = this.pageMargin;
      if (pdfStyles.margins?.left) {
        currentX += pdfStyles.margins.left;
      }

      for (const contentElement of el.content) {
        if (
          contentElement.type === 'text' &&
          (contentElement as TextElement).text
        ) {
          const mergedStyles = {
            ...pdfStyles,
            ...this.mapStyles(contentElement.styles || {}, contentElement),
          };
          await this.renderTextRun(
            (contentElement as TextElement).text,
            currentX,
            this.currentY,
            mergedStyles,
            contentElement as TextElement
          );

          // Update X position for next text run (basic horizontal flow)
          const font =
            this.fonts.get(mergedStyles.font!) ||
            this.fonts.get(StandardFonts.Helvetica)!;

          // Calculate actual font size used for rendering (considering subscript/superscript)
          let actualFontSize = mergedStyles.fontSize || 12;
          if (mergedStyles.subscript || mergedStyles.superscript) {
            actualFontSize *= 0.7;
          }

          const textWidth = font.widthOfTextAtSize(
            (contentElement as TextElement).text,
            actualFontSize
          );
          currentX += textWidth;
        } else if (contentElement.type === 'list') {
          // Handle nested lists
          this.currentY -= this.lineHeight;
          await this.convertList(contentElement as ListElement, pdfStyles, {});
        }
      }
    } else if (el.text) {
      const textX = this.pageMargin + (pdfStyles.margins?.left || 0);
      await this.renderTextRun(el.text, textX, this.currentY, pdfStyles);
    }

    // Apply bottom margin and default spacing
    this.currentY -= this.lineHeight + 5 + (pdfStyles.margins?.bottom || 0);
  }

  private async renderTextRun(
    text: string,
    x: number,
    y: number,
    styles: PDFStyleOptions,
    element?: TextElement
  ): Promise<void> {
    if (!this.page) return;

    const font =
      this.fonts.get(styles.font!) || this.fonts.get(StandardFonts.Helvetica)!;
    let fontSize = styles.fontSize || 12;
    let adjustedY = y;

    // Handle subscript/superscript
    if (styles.subscript) {
      fontSize *= 0.7;
      adjustedY -= fontSize * 0.3;
    } else if (styles.superscript) {
      fontSize *= 0.7;
      adjustedY += fontSize * 0.3;
    }

    // Draw background if specified
    if (styles.backgroundColor) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      this.page.drawRectangle({
        x: x - 2,
        y: adjustedY - fontSize * 0.2,
        width: textWidth + 4,
        height: fontSize * 1.2,
        color: rgb(
          styles.backgroundColor.r,
          styles.backgroundColor.g,
          styles.backgroundColor.b
        ),
      });
    }

    // Draw the text
    this.page.drawText(text, {
      x,
      y: adjustedY,
      size: fontSize,
      font,
      color: rgb(styles.fillColor!.r, styles.fillColor!.g, styles.fillColor!.b),
    });

    // Draw underline if specified
    if (styles.underline) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      this.page.drawLine({
        start: { x, y: adjustedY - 2 },
        end: { x: x + textWidth, y: adjustedY - 2 },
        thickness: 1,
        color: rgb(
          styles.fillColor!.r,
          styles.fillColor!.g,
          styles.fillColor!.b
        ),
      });
    }

    // Draw strikethrough if specified
    if (styles.strike) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      this.page.drawLine({
        start: { x, y: adjustedY + fontSize * 0.3 },
        end: { x: x + textWidth, y: adjustedY + fontSize * 0.3 },
        thickness: 1,
        color: rgb(
          styles.fillColor!.r,
          styles.fillColor!.g,
          styles.fillColor!.b
        ),
      });
    }

    // Handle hyperlinks (basic visual indication)
    if (element?.attributes?.href) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      // Draw link annotation if pdf-lib supports it, for now just underline
      if (!styles.underline) {
        this.page.drawLine({
          start: { x, y: adjustedY - 2 },
          end: { x: x + textWidth, y: adjustedY - 2 },
          thickness: 1,
          color: rgb(0, 0, 1), // Blue for links
        });
      }
    }
  }

  private async convertHeading(
    el: HeadingElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    const level = el.level || 1;
    const baseFontSize = pdfStyles.fontSize || 12;
    const headingFontSize = baseFontSize + (6 - level) * 2; // Scale based on heading level

    this.checkPageSpace(headingFontSize + 10);

    // Determine font with bold styling for headings
    let headingFont = pdfStyles.font;
    if (pdfStyles.bold && pdfStyles.italic) {
      headingFont = StandardFonts.HelveticaBoldOblique;
    } else if (pdfStyles.italic) {
      headingFont = StandardFonts.HelveticaOblique;
    } else {
      headingFont = StandardFonts.HelveticaBold; // Default headings to bold
    }

    if (el.content && el.content.length > 0) {
      let textLine = '';
      for (const contentElement of el.content) {
        if (
          contentElement.type === 'text' &&
          (contentElement as TextElement).text
        ) {
          textLine += (contentElement as TextElement).text;
        }
      }

      if (textLine) {
        const font =
          this.fonts.get(headingFont!) ||
          this.fonts.get(StandardFonts.HelveticaBold)!;

        this.page.drawText(textLine, {
          x: this.pageMargin,
          y: this.currentY,
          size: headingFontSize,
          font,
          color: rgb(
            pdfStyles.fillColor!.r,
            pdfStyles.fillColor!.g,
            pdfStyles.fillColor!.b
          ),
        });
      }
    } else if (el.text) {
      const font =
        this.fonts.get(headingFont!) ||
        this.fonts.get(StandardFonts.HelveticaBold)!;

      this.page.drawText(el.text, {
        x: this.pageMargin,
        y: this.currentY,
        size: headingFontSize,
        font,
        color: rgb(
          pdfStyles.fillColor!.r,
          pdfStyles.fillColor!.g,
          pdfStyles.fillColor!.b
        ),
      });
    }

    this.currentY -= headingFontSize + 10; // Add extra spacing after heading
  }

  private async convertText(
    el: TextElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page || !el.text) return;

    this.checkPageSpace(this.lineHeight);

    const font =
      this.fonts.get(pdfStyles.font!) ||
      this.fonts.get(StandardFonts.Helvetica)!;

    this.page.drawText(el.text, {
      x: this.pageMargin,
      y: this.currentY,
      size: pdfStyles.fontSize || 12,
      font,
      color: rgb(
        pdfStyles.fillColor!.r,
        pdfStyles.fillColor!.g,
        pdfStyles.fillColor!.b
      ),
    });

    this.currentY -= this.lineHeight;
  }

  private async convertList(
    el: ListElement,
    pdfStyles: PDFStyleOptions,
    rawStyles: Styles
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    this.currentY -= 10; // Space before list

    for (let i = 0; i < el.content.length; i++) {
      const item = el.content[i] as ListItemElement;
      const bullet = el.listType === 'ordered' ? `${i + 1}. ` : '• ';
      const itemStyles = { ...rawStyles, ...item.styles };
      const itemPdfStyles = this.mapStyles(itemStyles, item);

      this.checkPageSpace(this.lineHeight);

      const font =
        this.fonts.get(itemPdfStyles.font!) ||
        this.fonts.get(StandardFonts.Helvetica)!;

      if (item.content && item.content.length > 0) {
        let textLine = bullet;
        for (const contentEl of item.content) {
          if (contentEl.type === 'text' && (contentEl as TextElement).text) {
            textLine += (contentEl as TextElement).text;
          }
        }

        this.page.drawText(textLine, {
          x: this.pageMargin + 20, // Indent list items
          y: this.currentY,
          size: itemPdfStyles.fontSize || 12,
          font,
          color: rgb(
            itemPdfStyles.fillColor!.r,
            itemPdfStyles.fillColor!.g,
            itemPdfStyles.fillColor!.b
          ),
        });
      } else if (item.text) {
        this.page.drawText(bullet + item.text, {
          x: this.pageMargin + 20,
          y: this.currentY,
          size: itemPdfStyles.fontSize || 12,
          font,
          color: rgb(
            itemPdfStyles.fillColor!.r,
            itemPdfStyles.fillColor!.g,
            itemPdfStyles.fillColor!.b
          ),
        });
      }

      this.currentY -= this.lineHeight;
    }

    this.currentY -= 10; // Space after list
  }

  private async convertLine(
    el: LineElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    this.checkPageSpace(20);
    this.currentY -= 10; // Space before line

    const strokeColor = pdfStyles.strokeColor || { r: 0, g: 0, b: 0 };
    const lineWidth = pdfStyles.lineWidth || 1;

    this.page.drawLine({
      start: { x: this.pageMargin, y: this.currentY },
      end: { x: this.page.getWidth() - this.pageMargin, y: this.currentY },
      thickness: lineWidth,
      color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
    });

    this.currentY -= 10; // Space after line
  }

  private async convertImage(
    el: ImageElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page || !el.src) return;

    let dataBuffer: Buffer | Uint8Array | undefined;
    let imgDimensions = {
      width: pdfStyles.width || 100,
      height: pdfStyles.height || 100,
    };

    try {
      const src = el.src;
      if (src.startsWith('data:')) {
        const matches = src.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
        if (!matches || matches.length < 3) throw new Error('Invalid data URI');
        dataBuffer = Buffer.from(matches[2], 'base64');
      } else if (
        src.startsWith('http://') ||
        src.startsWith('https://') ||
        src.startsWith('//')
      ) {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Failed to fetch image from ${src}`);
        const arrayBuffer = await response.arrayBuffer();
        dataBuffer = Buffer.from(arrayBuffer);
      } else if (typeof window === 'undefined') {
        const imagePath = path.resolve(src);
        if (!fs.existsSync(imagePath))
          throw new Error(`File not found: ${imagePath}`);
        dataBuffer = fs.readFileSync(imagePath);
      }

      if (dataBuffer) {
        // Determine image type and embed
        let image: PDFImage;
        const imageType = el.src.includes('png') ? 'png' : 'jpg';

        if (imageType === 'png') {
          image = await this.doc.embedPng(dataBuffer);
        } else {
          image = await this.doc.embedJpg(dataBuffer);
        }

        const scaledDims = image.scaleToFit(
          imgDimensions.width,
          imgDimensions.height
        );

        this.checkPageSpace(scaledDims.height + 20);

        this.page.drawImage(image, {
          x: this.pageMargin,
          y: this.currentY - scaledDims.height,
          width: scaledDims.width,
          height: scaledDims.height,
        });

        this.currentY -= scaledDims.height + 10;
      }
    } catch (error) {
      console.error('Error loading image for PDF:', error);
      // Skip image on error
    }
  }

  private async convertTable(
    el: TableElement,
    pdfStyles: PDFStyleOptions,
    rawStyles: Styles
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    const { rows } = el;
    if (!rows || rows.length === 0) return;

    const columnCount = rows[0]?.cells.length || 1;
    const availableWidth = this.page.getWidth() - this.pageMargin * 2;
    const defaultColWidth = availableWidth / columnCount;
    const colWidths: number[] = Array(columnCount).fill(defaultColWidth);
    const rowHeight = 30; // Fixed row height for simplicity

    this.currentY -= 10; // Space before table

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      this.checkPageSpace(rowHeight + 10);

      let currentX = this.pageMargin;

      for (let j = 0; j < row.cells.length; j++) {
        const cell = row.cells[j];
        const cellText =
          cell.text ||
          cell.content?.map((c) => (c as TextElement).text).join(' ') ||
          '';
        const cellStyles = { ...rawStyles, ...row.styles, ...cell.styles };
        const cellPdfStyles = this.mapStyles(cellStyles, cell);

        // Draw cell border
        this.page.drawRectangle({
          x: currentX,
          y: this.currentY - rowHeight,
          width: colWidths[j],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw cell text
        if (cellText) {
          const font =
            this.fonts.get(cellPdfStyles.font!) ||
            this.fonts.get(StandardFonts.Helvetica)!;

          this.page.drawText(cellText, {
            x: currentX + 5, // padding
            y: this.currentY - rowHeight / 2 - 5, // center vertically
            size: cellPdfStyles.fontSize || 10,
            font,
            color: rgb(
              cellPdfStyles.fillColor!.r,
              cellPdfStyles.fillColor!.g,
              cellPdfStyles.fillColor!.b
            ),
            maxWidth: colWidths[j] - 10, // padding
          });
        }

        currentX += colWidths[j];
      }

      this.currentY -= rowHeight;
    }

    this.currentY -= 10; // Space after table
  }
}
