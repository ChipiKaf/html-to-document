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
  TableRowElement,
  TableCellElement,
  LineElement,
  Styles,
  IConverterDependencies,
  StyleMapper,
  IDocumentConverter,
} from 'html-to-document-core';
// import { colorConversion } from 'html-to-document-core/utils/html.utils'; // NEW
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

// Helper function to sanitize text for WinAnsi encoding compatibility
const sanitizeTextForPDF = (text: string): string => {
  // Replace specific problematic Unicode characters that cause WinAnsi encoding errors
  const unicodeReplacements: Record<string, string> = {
    '…': '...', // Ellipsis
    '–': '-', // En dash
    '—': '-', // Em dash
    '→': '->', // Right arrow
    '←': '<-', // Left arrow
    '↑': '^', // Up arrow
    '↓': 'v', // Down arrow
    '©': '(c)', // Copyright
    '®': '(R)', // Registered trademark
    '™': '(TM)', // Trademark
    '€': 'EUR', // Euro sign
    '£': 'GBP', // Pound sign
    '¥': 'YEN', // Yen sign
    // '✔': 'v', // Checkmark -> v (removed to preserve check-mark)
    // '✓': 'v', // Check mark -> v (removed to preserve check-mark)
    '✗': 'x', // Cross mark -> x
    '✘': 'x', // Heavy ballot x -> x
    // Remove problematic list markers (handled separately by getListMarker)
    '•': '*', // Bullet point
    '◦': '-', // White circle
    '■': '+', // Black square
  };

  // Handle smart quotes separately to avoid syntax issues
  const singleQuote = String.fromCharCode(39); // Single quote character
  let sanitized = text
    .replace(/[""]/g, '"') // Smart double quotes
    .replace(/['']/g, singleQuote); // Smart single quotes

  for (const [unicode, replacement] of Object.entries(unicodeReplacements)) {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), replacement);
  }

  return sanitized;
};

// PDF-specific style options interface

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
    this.addPDFSpecificMappings();
  }

  private addPDFSpecificMappings(): void {
    this._mapper.addMapping({
      // PDF-specific font mapping
      fontFamily: (v: string) => {
        const fontName = v.toLowerCase();
        if (fontName.includes('times')) {
          return { pdfFont: 'TimesRoman' };
        } else if (fontName.includes('courier')) {
          return { pdfFont: 'Courier' };
        } else {
          return { pdfFont: 'Helvetica' };
        }
      },
      // PDF-specific color mapping for fill/text color
      color: (v: string) => {
        const colorValue = v.startsWith('#') ? v : `#${v}`;
        const rgb = this.hexToRgb(colorValue);
        return { pdfFillColor: rgb };
      },
      backgroundColor: (v: string) => {
        const colorValue = v.startsWith('#') ? v : `#${v}`;
        const rgb = this.hexToRgb(colorValue);
        return { pdfBackgroundColor: rgb };
      },
      // PDF-specific font style mappings
      fontWeight: (v: string | number) => {
        if (v === 'bold' || Number(v) >= 700) {
          return { pdfBold: true };
        }
        return {};
      },
      fontStyle: (v: string) => {
        if (v === 'italic') {
          return { pdfItalic: true };
        }
        return {};
      },
      textDecoration: (v: string) => {
        const result: Record<string, boolean> = {};
        const decoration = String(v);
        if (decoration.includes('underline')) {
          result.pdfUnderline = true;
        }
        if (decoration.includes('line-through')) {
          result.pdfStrike = true;
        }
        return result;
      },
      verticalAlign: (v: string) => {
        if (v === 'sub') {
          return { pdfSubscript: true };
        } else if (v === 'super') {
          return { pdfSuperscript: true };
        }
        return {};
      },
      // PDF-specific alignment mapping
      textAlign: (v: string, el: DocumentElement) => {
        if (el.type === 'table') return {};
        const alignMap: Record<string, string> = {
          left: 'Left',
          center: 'Center',
          right: 'Right',
          justify: 'Center', // pdf-lib doesn't have justified
          justified: 'Center',
        };
        const alignment = alignMap[String(v).trim().toLowerCase()];
        return alignment ? { pdfAlign: alignment } : {};
      },
      // PDF-specific size mapping
      fontSize: (v: string | number) => {
        let fontSize = 12;
        if (typeof v === 'string') {
          if (v.endsWith('px')) {
            fontSize = parseFloat(v.slice(0, -2));
          } else if (v.endsWith('%')) {
            const base = 16;
            const percent = parseFloat(v.slice(0, -1));
            fontSize = base * (percent / 100);
          } else {
            fontSize = parseFloat(v) || 12;
          }
        } else {
          fontSize = v;
        }
        return { pdfFontSize: fontSize };
      },
    });
  }

  private mapStyles(styles: Styles, element: DocumentElement): PDFStyleOptions {
    const pdfOptions: PDFStyleOptions = {
      font: StandardFonts.Helvetica,
      fontSize: 12,
      fillColor: { r: 0, g: 0, b: 0 },
      align: TextAlignment.Left,
    };

    // Use the StyleMapper to get all style mappings (including PDF-specific ones)
    const genericStyles = this._mapper.mapStyles(styles, element);

    // Extract PDF-specific properties from the mapped styles
    this.extractPDFOptionsFromGenericStyles(genericStyles, pdfOptions);

    // Map core StyleMapper output to PDF-specific options (for backwards compatibility)
    this.mapGenericStylesToPDF(genericStyles, pdfOptions);

    // Update font based on bold/italic combination
    this.updateFontBasedOnStyle(pdfOptions);

    return pdfOptions;
  }

  private extractPDFOptionsFromGenericStyles(
    genericStyles: Record<string, unknown>,
    pdfOptions: PDFStyleOptions
  ): void {
    // Extract PDF-specific properties added by our mappings
    if (genericStyles.pdfFont) {
      const fontMap: Record<string, StandardFonts> = {
        TimesRoman: StandardFonts.TimesRoman,
        Courier: StandardFonts.Courier,
        Helvetica: StandardFonts.Helvetica,
      };
      pdfOptions.font =
        fontMap[genericStyles.pdfFont as string] || StandardFonts.Helvetica;
    }

    if (genericStyles.pdfFillColor) {
      pdfOptions.fillColor = genericStyles.pdfFillColor as {
        r: number;
        g: number;
        b: number;
      };
    }

    if (genericStyles.pdfBackgroundColor) {
      pdfOptions.backgroundColor = genericStyles.pdfBackgroundColor as {
        r: number;
        g: number;
        b: number;
      };
    }

    if (genericStyles.pdfBold) {
      pdfOptions.bold = genericStyles.pdfBold as boolean;
    }

    if (genericStyles.pdfItalic) {
      pdfOptions.italic = genericStyles.pdfItalic as boolean;
    }

    if (genericStyles.pdfUnderline) {
      pdfOptions.underline = genericStyles.pdfUnderline as boolean;
    }

    if (genericStyles.pdfStrike) {
      pdfOptions.strike = genericStyles.pdfStrike as boolean;
    }

    if (genericStyles.pdfSubscript) {
      pdfOptions.subscript = genericStyles.pdfSubscript as boolean;
    }

    if (genericStyles.pdfSuperscript) {
      pdfOptions.superscript = genericStyles.pdfSuperscript as boolean;
    }

    if (genericStyles.pdfAlign) {
      const alignMap: Record<string, TextAlignment> = {
        Left: TextAlignment.Left,
        Center: TextAlignment.Center,
        Right: TextAlignment.Right,
      };
      pdfOptions.align =
        alignMap[genericStyles.pdfAlign as string] || TextAlignment.Left;
    }

    if (genericStyles.pdfFontSize) {
      pdfOptions.fontSize = genericStyles.pdfFontSize as number;
    }
  }

  private mapGenericStylesToPDF(
    genericStyles: Record<string, unknown>,
    pdfOptions: PDFStyleOptions
  ): void {
    // Fallback mappings for core StyleMapper properties (for backwards compatibility)

    // Map color (from core mapper output) - fallback if pdfFillColor not set
    if (
      pdfOptions.fillColor?.r === 0 &&
      pdfOptions.fillColor?.g === 0 &&
      pdfOptions.fillColor?.b === 0 &&
      genericStyles.color
    ) {
      const color = genericStyles.color as string;
      pdfOptions.fillColor = this.hexToRgb(color);
    }

    // Map font properties - fallback if pdfFont not set
    if (pdfOptions.font === StandardFonts.Helvetica && genericStyles.font) {
      const fontName = (genericStyles.font as string).toLowerCase();
      if (fontName.includes('times')) {
        pdfOptions.font = StandardFonts.TimesRoman;
      } else if (fontName.includes('courier')) {
        pdfOptions.font = StandardFonts.Courier;
      } else {
        pdfOptions.font = StandardFonts.Helvetica;
      }
    }

    // Map size (from core mapper - comes as half-point units, convert to points)
    if (pdfOptions.fontSize === 12 && genericStyles.size) {
      pdfOptions.fontSize = (genericStyles.size as number) / 2;
    }

    // Map bold and italic - fallback if pdf properties not set
    if (!pdfOptions.bold && genericStyles.bold) {
      pdfOptions.bold = genericStyles.bold as boolean;
    }
    if (!pdfOptions.italic && genericStyles.italics) {
      pdfOptions.italic = genericStyles.italics as boolean;
    }

    // Map text decoration - fallback if pdf properties not set
    if (!pdfOptions.underline && genericStyles.underline) {
      pdfOptions.underline = true;
    }
    if (!pdfOptions.strike && genericStyles.strike) {
      pdfOptions.strike = genericStyles.strike as boolean;
    }

    // Map superscript/subscript - fallback if pdf properties not set
    if (!pdfOptions.superscript && genericStyles.superScript) {
      pdfOptions.superscript = genericStyles.superScript as boolean;
    }
    if (!pdfOptions.subscript && genericStyles.subScript) {
      pdfOptions.subscript = genericStyles.subScript as boolean;
    }

    // Map alignment (from core mapper) - fallback if pdfAlign not set
    if (pdfOptions.align === TextAlignment.Left && genericStyles.alignment) {
      const alignMap: Record<string, TextAlignment> = {
        left: TextAlignment.Left,
        center: TextAlignment.Center,
        right: TextAlignment.Right,
        both: TextAlignment.Center, // pdf-lib doesn't have justified, use center
        justified: TextAlignment.Center,
      };
      pdfOptions.align =
        alignMap[genericStyles.alignment as string] || TextAlignment.Left;
    }

    // Map background color/shading - fallback if pdfBackgroundColor not set
    if (
      !pdfOptions.backgroundColor &&
      genericStyles.shading &&
      typeof genericStyles.shading === 'object'
    ) {
      const shading = genericStyles.shading as { fill?: string };
      if (shading.fill) {
        pdfOptions.backgroundColor = this.hexToRgb(shading.fill);
      }
    }

    // Map margins (from core mapper spacing/indent)
    if (genericStyles.spacing && typeof genericStyles.spacing === 'object') {
      const spacing = genericStyles.spacing as {
        before?: number;
        after?: number;
      };
      if (!pdfOptions.margins) {
        pdfOptions.margins = { top: 0, right: 0, bottom: 0, left: 0 };
      }
      if (spacing.before) {
        pdfOptions.margins.top = spacing.before / 20; // Convert twips to points
      }
      if (spacing.after) {
        pdfOptions.margins.bottom = spacing.after / 20;
      }
    }

    if (genericStyles.indent && typeof genericStyles.indent === 'object') {
      const indent = genericStyles.indent as { left?: number; right?: number };
      if (!pdfOptions.margins) {
        pdfOptions.margins = { top: 0, right: 0, bottom: 0, left: 0 };
      }
      if (indent.left) {
        pdfOptions.margins.left = indent.left / 20; // Convert twips to points
      }
      if (indent.right) {
        pdfOptions.margins.right = indent.right / 20;
      }
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Handle 3-digit hex
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
      const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
      const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
      return { r, g, b };
    }

    // Handle 6-digit hex
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
      const b = parseInt(cleanHex.substr(4, 2), 16) / 255;
      return { r, g, b };
    }

    // Default to black
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Splits a long string into multiple lines that fit within the given width when rendered
   * with the supplied font and size.
   */
  private wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const words = sanitizeTextForPDF(text).split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const tentative = currentLine ? `${currentLine} ${word}` : word;
      const width = this.measureTextWidth(font, fontSize, tentative);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = tentative;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Computes text width but ignores ✓/✔ segments which we draw manually as vector glyphs.
   */
  private measureTextWidth(
    font: PDFFont,
    fontSize: number,
    text: string
  ): number {
    const parts = text.split(/(✓|✔)/);
    let width = 0;
    for (const part of parts) {
      if (!part) continue;
      if (part === '✓' || part === '✔') {
        width += fontSize; // approximate same width we reserve when drawing
      } else {
        width += font.widthOfTextAtSize(sanitizeTextForPDF(part), fontSize);
      }
    }
    return width;
  }

  /**
   * Draws a simple check‑mark symbol using two stroked line segments.
   * Returns the approximate width consumed so the caller can advance X.
   */
  private drawCheckMark(x: number, y: number, size: number) {
    if (!this.page) return 0;
    const thickness = Math.max(1, size * 0.1);
    const left = x;
    const midX = x + size * 0.35;
    const midY = y - size * 0.2;
    const right = x + size;
    const topY = y + size * 0.4;
    this.page.drawLine({
      start: { x: left, y: midY },
      end: { x: midX, y: y - size * 0.5 },
      thickness,
      color: rgb(0, 0, 0),
    });
    this.page.drawLine({
      start: { x: midX, y: y - size * 0.5 },
      end: { x: right, y: topY },
      thickness,
      color: rgb(0, 0, 0),
    });
    return size; // approximate width
  }

  private updateFontBasedOnStyle(pdfOptions: PDFStyleOptions): void {
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

    // Extract block‑quote like styles (border‑left, padding‑left, margin‑left)
    const raw = el.styles || {};
    const borderLeftWidthPx = raw.borderLeftWidth
      ? parseFloat(String(raw.borderLeftWidth))
      : 0;
    // const borderLeftColorCss = (raw.borderLeftColor as string) || 'lightGray';
    // const borderLeftColor = this.hexToRgb(colorConversion(borderLeftColorCss));
    const paddingLeftPx = raw.paddingLeft
      ? parseFloat(String(raw.paddingLeft))
      : 0;
    const marginLeftPx = raw.marginLeft
      ? parseFloat(String(raw.marginLeft))
      : 0;

    // Convert to PDF points
    const borderLeftWidthPt = borderLeftWidthPx; // 1 px ≈ 1 pt for our simple screen use‑case
    const paddingLeftPt = paddingLeftPx;
    const marginLeftPt = marginLeftPx;

    // Shift the starting X of the paragraph to honour margin + padding + border
    let blockOffsetX =
      this.pageMargin +
      marginLeftPt +
      paddingLeftPt +
      (borderLeftWidthPt > 0 ? borderLeftWidthPt + 4 : 0);

    this.checkPageSpace(this.lineHeight * 2);

    // Apply margins if specified
    if (pdfStyles.margins?.top) {
      this.currentY -= pdfStyles.margins.top;
    }

    if (el.content && el.content.length > 0) {
      // Handle multiple text runs with different styles
      let currentX = blockOffsetX;
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
            sanitizeTextForPDF((contentElement as TextElement).text),
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
      const textX = blockOffsetX + (pdfStyles.margins?.left || 0);
      await this.renderTextRun(el.text, textX, this.currentY, pdfStyles);
    }

    // Draw block‑quote left border after text has occupied its height
    if (borderLeftWidthPt > 0) {
      this.page.drawRectangle({
        x: this.pageMargin + marginLeftPt,
        y: this.currentY + 5, // top of the vertical bar
        width: borderLeftWidthPt,
        height: this.lineHeight, // bar height matches one paragraph line
        color: rgb(0, 0, 0),
        borderWidth: 0,
      });
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

    // Sanitize but keep ✓ ✔ for special handling
    const segments = text.split(/(✓|✔)/);

    let cursorX = x;
    for (const seg of segments) {
      if (!seg) continue;
      if (seg === '✓' || seg === '✔') {
        // draw vector check‑mark
        const advance = this.drawCheckMark(
          cursorX,
          adjustedY + fontSize * 0.25,
          fontSize
        );
        cursorX += advance;
        continue;
      }

      const sanitized = sanitizeTextForPDF(seg);

      // Draw background if specified
      if (styles.backgroundColor && sanitized.trim() !== '') {
        const textWidth = font.widthOfTextAtSize(sanitized, fontSize);
        this.page.drawRectangle({
          x: cursorX - 2,
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

      this.page.drawText(sanitized, {
        x: cursorX,
        y: adjustedY,
        size: fontSize,
        font,
        color: rgb(
          styles.fillColor!.r,
          styles.fillColor!.g,
          styles.fillColor!.b
        ),
      });

      const w = font.widthOfTextAtSize(sanitized, fontSize);
      cursorX += w;
    }

    // Draw underline if specified
    if (styles.underline) {
      const sanitizedText = sanitizeTextForPDF(text);
      const textWidth = font.widthOfTextAtSize(sanitizedText, fontSize);
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
      const sanitizedText = sanitizeTextForPDF(text);
      const textWidth = font.widthOfTextAtSize(sanitizedText, fontSize);
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
      const sanitizedText = sanitizeTextForPDF(text);
      const textWidth = font.widthOfTextAtSize(sanitizedText, fontSize);
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

        this.page.drawText(sanitizeTextForPDF(textLine), {
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

      this.page.drawText(sanitizeTextForPDF(el.text), {
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

    this.page.drawText(sanitizeTextForPDF(el.text), {
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
      const itemStyles = { ...rawStyles, ...item.styles };
      const itemPdfStyles = this.mapStyles(itemStyles, item);

      await this.convertListItem(item, el.listType, i, itemPdfStyles, 0);
    }

    this.currentY -= 5; // Space after list
  }

  private async convertListItem(
    item: ListItemElement,
    listType: string,
    index: number,
    pdfStyles: PDFStyleOptions,
    level: number
  ): Promise<void> {
    if (!this.page) return;

    this.checkPageSpace(this.lineHeight);

    // Calculate indentation based on level (similar to DOCX adapter)
    const baseIndent = 20;
    const levelIndent = level * 20;
    const totalIndent = this.pageMargin + baseIndent + levelIndent;

    const markerX = totalIndent - 15;
    const markerCenterY = this.currentY + (pdfStyles.fontSize || 12) * 0.3;
    const bulletSize = 3;

    const font =
      this.fonts.get(pdfStyles.font!) ||
      this.fonts.get(StandardFonts.Helvetica)!;

    if (listType === 'ordered') {
      const marker = `${index + 1}.`;
      this.page.drawText(marker, {
        x: markerX,
        y: this.currentY,
        size: pdfStyles.fontSize || 12,
        font,
        color: rgb(
          pdfStyles.fillColor!.r,
          pdfStyles.fillColor!.g,
          pdfStyles.fillColor!.b
        ),
      });
    } else {
      switch (level) {
        case 0: // filled circle
          this.page.drawCircle({
            x: markerX + bulletSize,
            y: markerCenterY,
            size: bulletSize,
            color: rgb(
              pdfStyles.fillColor!.r,
              pdfStyles.fillColor!.g,
              pdfStyles.fillColor!.b
            ),
          });
          break;
        case 1: // open circle
          this.page.drawCircle({
            x: markerX + bulletSize,
            y: markerCenterY,
            size: bulletSize,
            borderWidth: 1,
            borderColor: rgb(
              pdfStyles.fillColor!.r,
              pdfStyles.fillColor!.g,
              pdfStyles.fillColor!.b
            ),
            color: undefined,
          });
          break;
        default: // level 2+ filled square
          this.page.drawRectangle({
            x: markerX + bulletSize,
            y: markerCenterY - bulletSize,
            width: bulletSize * 2,
            height: bulletSize * 2,
            color: rgb(
              pdfStyles.fillColor!.r,
              pdfStyles.fillColor!.g,
              pdfStyles.fillColor!.b
            ),
          });
          break;
      }
    }

    if (item.content && item.content.length > 0) {
      // Handle complex content with multiple text runs and nested elements
      let currentX = totalIndent;
      for (const contentEl of item.content) {
        if (contentEl.type === 'text' && (contentEl as TextElement).text) {
          const textElement = contentEl as TextElement;
          const elementStyles = {
            ...pdfStyles,
            ...this.mapStyles(contentEl.styles || {}, contentEl),
          };
          this.page.drawText(sanitizeTextForPDF(textElement.text), {
            x: currentX,
            y: this.currentY,
            size: elementStyles.fontSize || 12,
            font: this.fonts.get(elementStyles.font!) || font,
            color: rgb(
              elementStyles.fillColor!.r,
              elementStyles.fillColor!.g,
              elementStyles.fillColor!.b
            ),
          });
          // Update X position for next text element
          const textFont = this.fonts.get(elementStyles.font!) || font;
          const textWidth = textFont.widthOfTextAtSize(
            sanitizeTextForPDF(textElement.text),
            elementStyles.fontSize || 12
          );
          currentX += textWidth;
        } else if (contentEl.type === 'list') {
          // Handle nested lists
          this.currentY -= this.lineHeight;
          const nestedList = contentEl as ListElement;
          for (let j = 0; j < nestedList.content.length; j++) {
            const nestedItem = nestedList.content[j] as ListItemElement;
            await this.convertListItem(
              nestedItem,
              nestedList.listType,
              j,
              pdfStyles,
              level + 1
            );
          }
          return; // Don't decrement Y again after nested list
        }
      }
    } else if (item.text) {
      this.page.drawText(sanitizeTextForPDF(item.text), {
        x: totalIndent,
        y: this.currentY,
        size: pdfStyles.fontSize || 12,
        font,
        color: rgb(
          pdfStyles.fillColor!.r,
          pdfStyles.fillColor!.g,
          pdfStyles.fillColor!.b
        ),
      });
    }

    this.currentY -= this.lineHeight;
  }

  // getListMarker is no longer used for unordered lists, but kept for ordered lists
  private getListMarker(listType: string, index: number): string {
    if (listType === 'ordered') {
      return `${index + 1}.`;
    }
    // No longer used for unordered lists (bullets drawn as shapes)
    return '';
  }

  private async convertLine(
    el: LineElement,
    pdfStyles: PDFStyleOptions
  ): Promise<void> {
    if (!this.doc || !this.page) return;

    const lineGap = 15; // pts of whitespace before and after an <hr>
    this.checkPageSpace(lineGap * 2);
    this.currentY -= lineGap; // Space before line

    const strokeColor = pdfStyles.strokeColor || { r: 0, g: 0, b: 0 };
    const lineWidth = pdfStyles.lineWidth || 1;

    this.page.drawLine({
      start: { x: this.pageMargin, y: this.currentY },
      end: { x: this.page.getWidth() - this.pageMargin, y: this.currentY },
      thickness: lineWidth,
      color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
    });

    this.currentY -= lineGap; // Space after line
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
    _pdfStyles: PDFStyleOptions,
    rawStyles: Styles
  ): Promise<void> {
    if (!this.doc || !this.page) return;
    const rows = el.rows ?? [];
    if (rows.length === 0) return;

    // --------- PRE‑COMPUTE COLUMN WIDTHS ----------
    // Count logical columns from first row (respecting colspan)
    let columnCount = 0;
    for (const cell of rows[0].cells) columnCount += cell.colspan ?? 1;

    const pageWidth = this.page.getWidth();
    const tableWidth = pageWidth - this.pageMargin * 2;
    const colWidths = Array(columnCount).fill(tableWidth / columnCount);

    // --------- FIRST PASS  →  ROW HEIGHTS ----------
    const rowHeights: number[] = [];
    const fontCache = (fontName?: StandardFonts) =>
      this.fonts.get(fontName || StandardFonts.Helvetica) ??
      this.fonts.get(StandardFonts.Helvetica)!;

    for (const row of rows) {
      let maxHeight = 0;
      let colIdx = 0;

      for (const cell of row.cells) {
        // Skip phantom columns already occupied by an active rowspan in a previous row
        const spanLeft =
          (rows as TableRowElement[] & { _rowspanTracker?: number[] })
            ._rowspanTracker ??
          ((
            rows as TableRowElement[] & { _rowspanTracker?: number[] }
          )._rowspanTracker = Array(columnCount).fill(0));
        while (spanLeft[colIdx] > 0) {
          colIdx++;
        }

        const colspan = cell.colspan ?? 1;
        const cellWidth = colWidths
          .slice(colIdx, colIdx + colspan)
          .reduce((a, b) => a + b, 0);

        const combinedStyles = { ...rawStyles, ...row.styles, ...cell.styles };
        const pdfOpts = this.mapStyles(combinedStyles, cell);

        const font = fontCache(pdfOpts.font);
        const fontSize = pdfOpts.fontSize ?? 10;

        // Estimate wrapped text height
        const content = this.getCellTextContent(cell);
        const lines = this.wrapText(
          content,
          font,
          fontSize,
          cellWidth - 10 /* padding * 2 */
        );
        const estimated = lines.length * (fontSize + 2) + 10; // padding 5 top/bot

        maxHeight = Math.max(maxHeight, estimated);

        // Register rowspan so later rows know some columns are taken
        const rowspan = cell.rowspan ?? 1;
        if (rowspan > 1) {
          for (let k = 0; k < colspan; k++) {
            spanLeft[colIdx + k] = rowspan - 1;
          }
        }

        colIdx += colspan;
      }

      rowHeights.push(maxHeight);

      // Decrement tracker counts for next iteration
      const spanLeft = (
        rows as TableRowElement[] & { _rowspanTracker?: number[] }
      )._rowspanTracker;
      if (spanLeft) {
        for (let i = 0; i < spanLeft.length; i++) {
          if (spanLeft[i] > 0) spanLeft[i]--;
        }
      }
    }

    delete (rows as TableRowElement[] & { _rowspanTracker?: number[] })
      ._rowspanTracker; // cleanup helper

    // --------- SECOND PASS  →  RENDER ----------
    const rowspanLeft: number[] = Array(columnCount).fill(0);
    this.currentY -= 15; // space before table

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rowHeight = rowHeights[r];

      // Ensure the tallest piece of a potential rowspan fits on page
      this.checkPageSpace(rowHeight);

      let colIdx = 0;
      let x = this.pageMargin;

      for (const cell of row.cells) {
        // Skip columns masked by active rowspan
        while (rowspanLeft[colIdx] > 0) {
          x += colWidths[colIdx];
          rowspanLeft[colIdx]--;
          colIdx++;
        }

        const colspan = cell.colspan ?? 1;
        const rowspan = cell.rowspan ?? 1;
        const cellWidth = colWidths
          .slice(colIdx, colIdx + colspan)
          .reduce((a, b) => a + b, 0);
        const cellHeight = rowHeights
          .slice(r, r + rowspan)
          .reduce((a, b) => a + b, 0);

        // Mark columns as blocked for upcoming rows if rowspan > 1
        if (rowspan > 1) {
          for (let k = 0; k < colspan; k++) {
            rowspanLeft[colIdx + k] = rowspan - 1;
          }
        }

        const combinedStyles = { ...rawStyles, ...row.styles, ...cell.styles };
        const pdfOpts = this.mapStyles(combinedStyles, cell);
        const font = fontCache(pdfOpts.font);
        const fontSize = pdfOpts.fontSize ?? 10;

        // BACKGROUND
        if (pdfOpts.backgroundColor) {
          this.page.drawRectangle({
            x,
            y: this.currentY - cellHeight,
            width: cellWidth,
            height: cellHeight,
            color: rgb(
              pdfOpts.backgroundColor.r,
              pdfOpts.backgroundColor.g,
              pdfOpts.backgroundColor.b
            ),
            borderWidth: 0,
          });
        }

        // BORDER
        this.page.drawRectangle({
          x,
          y: this.currentY - cellHeight,
          width: cellWidth,
          height: cellHeight,
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        });

        // TEXT
        const content = this.getCellTextContent(cell);
        const lines = this.wrapText(content, font, fontSize, cellWidth - 10);
        let textY = this.currentY - 5 - fontSize; // 5pt top padding then baseline
        for (const line of lines) {
          await this.renderTextRun(line, x + 5, textY, {
            ...pdfOpts,
            fontSize,
            font: pdfOpts.font,
          });
          textY -= fontSize + 2;
        }

        x += cellWidth;
        colIdx += colspan;
      }

      this.currentY -= rowHeight;
    }

    this.currentY -= 30; // a bit more breathing room after the table
  }

  private getCellTextContent(cell: TableCellElement): string {
    if (cell.text) {
      return cell.text;
    }

    if (cell.content && cell.content.length > 0) {
      return cell.content
        .filter((c: DocumentElement) => c.type === 'text')
        .map((c: DocumentElement) =>
          sanitizeTextForPDF((c as TextElement).text || '')
        )
        .join(' ');
    }

    return '';
  }
}
