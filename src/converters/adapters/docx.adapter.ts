import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
} from 'docx';
import {
  DocumentElement,
  HeadingElement,
  ImageElement,
  ListElement,
  ParagraphElement,
  TextElement,
} from '../../core/types';
import { IDocumentConverter } from '../IDocumentConverter';

export class DocxAdapter implements IDocumentConverter {
  async convert(elements: DocumentElement[]): Promise<Buffer> {
    // Convert our intermediate representation into an array of docx children.
    const children = elements.flatMap((el) => this.convertElement(el));

    // Create a docx Document with a single section.
    const doc = new Document({
      sections: [
        {
          children: children,
        },
      ],
    });

    // Pack the document to a Buffer.
    return await Packer.toBuffer(doc);
  }

  private handlers: Record<
    string,
    (
      el: DocumentElement,
      styles: { [key: string]: string }
    ) => Paragraph | Table | TextRun
  > = {
    paragraph: this.convertParagraph.bind(this),
    heading: this.convertHeading.bind(this),
    list: this.convertList.bind(this),
    image: this.convertImage.bind(this),
    table: this.convertTable.bind(this),
    text: this.convertText.bind(this),
    custom: this.convertParagraph.bind(this), // fallback
  };

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private convertElement(el: DocumentElement): (Paragraph | Table)[] {
    switch (el.type) {
      case 'paragraph':
        return [this.convertParagraph(el as ParagraphElement)];

      case 'heading':
        return [this.convertHeading(el as HeadingElement)];

      case 'list':
        return this.convertList(el as ListElement);

      case 'image':
        return [this.convertImage(el as ImageElement)];

      case 'table':
        return [this.convertTable(el)];

      // You can add more cases for 'link', 'code', 'blockquote', etc.
      case 'custom':
      default:
        // For any unrecognized type, treat it as a paragraph.
        return [this.convertParagraph(el as DocumentElement)];
    }
  }

  private convertParagraph(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph {
    const el = _el as ParagraphElement;
    // If there are nested inline children, create multiple text runs.
    if (el.content && el.content.length > 0) {
      // Merge parent's styles into each child (child style overrides parent's if provided)
      const children = el.content.map((child) => {
        const handler = this.handlers[child.type] || this.handlers.custom;
        // Create a new TextRun with the merged styles and child's text.
        return handler(child, { ...el.styles });
      });
      return new Paragraph({
        children,
      });
    }
    // Otherwise, if no nested children, simply create one TextRun.
    return new Paragraph({
      children: [
        new TextRun({
          text: el.text || '',
          // @Todo: Figure out the best way to map styles
          bold: el.styles?.['font-weight'] === 'bold',
        }),
      ],
    });
  }

  private convertHeading(
    _el: DocumentElement,
    style: { [key: string]: any } = {}
  ): Paragraph {
    const el = _el as HeadingElement;
    const level = el.level && el.level >= 1 && el.level <= 6 ? el.level : 1;

    if (el.content && el.content.length > 0) {
      const children = el.content.map((child) => {
        const handler = this.handlers[child.type] || this.handlers.custom;
        // Create a new TextRun with the merged styles and child's text.
        return handler(child, { ...el.styles });
      });

      return new Paragraph({
        heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
        children,
      });
    }

    return new Paragraph({
      text: el.text || '',
      heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
      // bold: el.styles?.['font-weight'] === 'bold',
    });
  }

  private convertText(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ) {
    const el = _el as TextElement;
    const mergedStyles = { ...styles, ...el.styles };
    return new TextRun({
      text: el.text || '',
      // @Todo: Figure out the best way to map styles
      bold: mergedStyles['font-weight'] === 'bold',
      color: mergedStyles['color']
        ? mergedStyles['color'].replace('#', '')
        : undefined,
    });
  }

  private convertList(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph[] {
    const el = _el as ListElement;
    // Determine the numbering reference based on the list type and optionally markerStyle.
    let reference: string;
    if (el.listType === 'ordered') {
      reference = el.markerStyle
        ? `ordered-${el.markerStyle}`
        : 'numbered-list';
    } else {
      reference = el.markerStyle
        ? `unordered-${el.markerStyle}`
        : 'bullet-list';
    }

    // For each list-item, create a paragraph with the numbering info.
    return el.content.map((item) => {
      return new Paragraph({
        text: item.text,
        numbering: {
          reference,
          level: 0, // Default to level 0; you could extend your interface to allow nesting.
        },
        // Optionally, you can merge in any styles if needed.
      });
    });
  }

  private convertImage(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph {
    // For a real implementation, you might need to load the image from a URL or file.
    // Here we assume that el.src is a base64 encoded string for simplicity.
    // You also might want to use el.attributes to read width/height.
    const el = _el as ImageElement;
    return new Paragraph({
      children: [
        new ImageRun({
          data: Buffer.from(el.src || '', 'base64'),
          transformation: { width: 100, height: 100 },
          type: 'png', // specify the image type (e.g. 'png', 'jpeg')
          // fallback: 'Image could not be displayed', // a fallback message if needed
        }),
      ],
    });
  }

  private convertTable(
    el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Table {
    // This is a very simplified version.
    // Assume that el.rows is an array of arrays, where each inner array represents a row of cells (each cell being a string).
    const rows: TableRow[] = [];
    // const rows = (el.rows || []).map(
    //   (row: any[]) =>
    //     new TableRow({
    //       children: row.map(
    //         (cell) =>
    //           new TableCell({
    //             children: [new Paragraph(String(cell))],
    //           })
    //       ),
    //     })
    // );

    return new Table({ rows });
  }
}
