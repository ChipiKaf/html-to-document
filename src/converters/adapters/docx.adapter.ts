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
  MathRun,
} from 'docx';
import {
  DocumentElement,
  HeadingElement,
  ImageElement,
  ListElement,
  ListItemElement,
  ParagraphElement,
  TextElement,
} from '../../core/types';
import { IDocumentConverter } from '../IDocumentConverter';
import { StyleMapper } from '../../core/style.mapper';

import { Numbering, NumberFormat, AlignmentType } from 'docx';

const isInline = (el: TextRun | ImageRun | MathRun | Paragraph | Table) => {
  if (el instanceof TextRun || el instanceof ImageRun || el instanceof MathRun)
    return true;
  return false;
};
export class DocxAdapter implements IDocumentConverter {
  private _mapper: StyleMapper;

  constructor() {
    this._mapper = new StyleMapper();
  }

  async convert(elements: DocumentElement[]): Promise<Buffer> {
    // Convert our intermediate representation into an array of docx children.
    const children = elements.flatMap((el) => this.convertElement(el));

    // Create a docx Document with a single section.
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'unordered',
            levels: [
              {
                level: 0,
                format: NumberFormat.BULLET,
                text: '•', // disc
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
              {
                level: 1,
                format: NumberFormat.BULLET,
                text: '◦', // circle
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
              },
              {
                level: 2,
                format: NumberFormat.BULLET,
                text: '▪', // square
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
              },
            ],
          },
          {
            reference: 'ordered',
            levels: [
              {
                level: 0,
                format: NumberFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
              {
                level: 1,
                format: NumberFormat.DECIMAL,
                text: '%2.',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
              },
            ],
          },
        ],
      },
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
    ) =>
      | Paragraph
      | Table
      | TextRun
      | ImageRun
      | (Paragraph | Table | TextRun | ImageRun)[]
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
        return [...this.convertParagraph(el as ParagraphElement)];

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
        return [...this.convertParagraph(el as DocumentElement)];
    }
  }

  private convertParagraph(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): (Paragraph | Table)[] {
    const el = _el as ParagraphElement;
    // If there are nested inline children, create multiple text runs.
    const mergedStyles = { ...styles, ...el.styles };
    if (el.content && el.content.length > 0) {
      // Merge parent's styles into each child (child style overrides parent's if provided)
      let prevChild: Paragraph | Table | TextRun | ImageRun;
      return el.content
        .map((child) => {
          const handler = this.handlers[child.type] || this.handlers.custom;
          // Create a new TextRun with the merged styles and child's text.
          return handler(child, { ...styles, ...el.styles });
        })
        .flat()
        .reduce<(Paragraph | Table)[]>((acc, child, currentIndex) => {
          const isPreviousInline =
            currentIndex > 0 && prevChild && isInline(prevChild);

          if (isPreviousInline && isInline(child)) {
            acc[acc.length - 1].addChildElement(child);
          } else if (isInline(child)) {
            acc.push(
              new Paragraph({
                run: {
                  ...this._mapper.mapStyles(mergedStyles),
                },
                children: [child],
                ...this._mapper.mapStyles(mergedStyles),
              })
            );
          } else {
            acc.push(child as Paragraph | Table);
          }

          prevChild = child;

          return acc;
        }, []);
    }
    // Otherwise, if no nested children, simply create one TextRun.
    return [
      new Paragraph({
        ...this._mapper.mapStyles(mergedStyles || {}),
        children: [
          new TextRun({
            text: el.text || '',
            ...this._mapper.mapStyles(mergedStyles || {}),
          }),
        ],
      }),
    ];
  }

  private convertHeading(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph {
    const el = _el as HeadingElement;
    const level = el.level && el.level >= 1 && el.level <= 6 ? el.level : 1;
    const mergedStyles = { ...styles, ...el.styles };

    if (el.content && el.content.length > 0) {
      const children = el.content
        .map((child) => {
          const handler = this.handlers[child.type] || this.handlers.custom;
          // Create a new TextRun with the merged styles and child's text.
          return handler(child, { ...styles, ...el.styles });
        })
        .flat();

      // @To-do: This may not work well in case of overlap... Check how to separate inline from block styles
      return new Paragraph({
        heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
        children,
        run: {
          ...this._mapper.mapStyles(mergedStyles),
        },
        ...this._mapper.mapStyles(mergedStyles),
      });
    }

    return new Paragraph({
      text: el.text || '',
      heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
      run: {
        ...this._mapper.mapStyles(mergedStyles),
      },
      ...this._mapper.mapStyles(mergedStyles),
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
      ...this._mapper.mapStyles(mergedStyles),
    });
  }

  private convertList(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph[] {
    const el = _el as ListElement;
    return el.content
      .map((child) => {
        child['metadata'] = {
          ...child['metadata'],
          reference: `${el.listType}${
            el.markerStyle && el.markerStyle !== '' ? `-${el.markerStyle}` : ''
          }`,
        };
        return this._convertListItem(child, { ...styles, ...el.styles }).flat();
      })
      .flat();
  }

  private _convertListItem(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph[] {
    const el = _el as ListItemElement;
    const mergedStyles = { ...styles, ...el.styles };
    // If there are nested inline children, create multiple text runs.
    if (el.content && el.content.length > 0) {
      // Merge parent's styles into each child (child style overrides parent's if provided)
      let prevChild: Paragraph | Table | TextRun | ImageRun;
      return el.content
        .map((child) => {
          const handler = this.handlers[child.type] || this.handlers.custom;
          // Create a new TextRun with the merged styles and child's text.
          return handler(child, { ...styles, ...el.styles });
        })
        .flat()
        .reduce<Paragraph[]>((acc, child, currentIndex) => {
          const isPreviousInline =
            currentIndex > 0 && prevChild && isInline(prevChild);

          if (isPreviousInline && isInline(child)) {
            acc[acc.length - 1].addChildElement(child);
          } else if (isInline(child)) {
            acc.push(
              new Paragraph({
                numbering: {
                  reference: el.metadata?.reference || '',
                  level: el.level,
                },
                run: {
                  ...this._mapper.mapStyles(mergedStyles),
                },
                children: [child],
                ...this._mapper.mapStyles(mergedStyles),
              })
            );
          } else {
            acc.push(child as Paragraph);
          }

          prevChild = child;

          return acc;
        }, []);
    }
    return [
      new Paragraph({
        numbering: {
          reference: el.metadata?.reference || '',
          level: el.level,
        },
        text: el.text,
        run: {
          ...this._mapper.mapStyles(mergedStyles),
        },
      }),
    ];
  }

  private convertImage(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Paragraph {
    // For a real implementation, you might need to load the image from a URL or file.
    // Here we assume that el.src is a base64 encoded string for simplicity.
    // You also might want to use el.attributes to read width/height.
    const el = _el as ImageElement;
    const mergedStyles = { ...styles, ...el.styles };
    return new Paragraph({
      children: [
        new ImageRun({
          data: Buffer.from(el.src || '', 'base64'),
          transformation: { width: 100, height: 100 },
          type: 'png', // specify the image type (e.g. 'png', 'jpeg')
          ...this._mapper.mapStyles(mergedStyles),
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
