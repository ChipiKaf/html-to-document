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
import { DocumentElement } from '../../core/types';
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

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private convertElement(el: DocumentElement): (Paragraph | Table)[] {
    switch (el.type) {
      case 'paragraph':
        return [this.convertParagraph(el)];

      case 'heading':
        return [this.convertHeading(el)];

      case 'list':
        // For simplicity, assume the text field contains the list item.
        // In a more advanced version, you would recursively convert the content.
        return [this.convertList(el)];

      case 'image':
        return [this.convertImage(el)];

      case 'table':
        return [this.convertTable(el)];

      // You can add more cases for 'link', 'code', 'blockquote', etc.
      case 'custom':
      default:
        // For any unrecognized type, treat it as a paragraph.
        return [this.convertParagraph(el)];
    }
  }

  private convertParagraph(el: DocumentElement): Paragraph {
    return new Paragraph({
      children: [new TextRun(el.text || '')],
    });
  }

  private convertHeading(el: DocumentElement): Paragraph {
    // Ensure level is between 1 and 6
    const level = el.level && el.level >= 1 && el.level <= 6 ? el.level : 1;
    return new Paragraph({
      text: el.text || '',
      heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
    });
  }

  private convertList(el: DocumentElement): Paragraph {
    // In a full implementation, you might iterate over el.content if it contains list items.
    // Here we simply create a bullet paragraph.
    return new Paragraph({
      text: el.text || '',
      bullet: { level: 0 },
    });
  }

  private convertImage(el: DocumentElement): Paragraph {
    // For a real implementation, you might need to load the image from a URL or file.
    // Here we assume that el.src is a base64 encoded string for simplicity.
    // You also might want to use el.attributes to read width/height.
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

  private convertTable(el: DocumentElement): Table {
    // This is a very simplified version.
    // Assume that el.rows is an array of arrays, where each inner array represents a row of cells (each cell being a string).
    const rows = (el.rows || []).map(
      (row: any[]) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph(String(cell))],
              })
          ),
        })
    );

    return new Table({ rows });
  }
}
