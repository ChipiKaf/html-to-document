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
  ExternalHyperlink,
  VerticalAlign,
  BorderStyle,
  IImageOptions,
} from 'docx';
import {
  DocumentElement,
  GridCell,
  HeadingElement,
  IConverterDependencies,
  ImageElement,
  LineElement,
  ListElement,
  ListItemElement,
  ParagraphElement,
  Styles,
  TableElement,
  TextElement,
} from '../../core/types';
import { IDocumentConverter } from '../IDocumentConverter';
import { StyleMapper } from '../../core/style.mapper';

import { NumberFormat, AlignmentType } from 'docx';
import { handleChildren, isInline, toBinaryBuffer } from './docx.util';

export class DocxAdapter implements IDocumentConverter {
  private _mapper: StyleMapper;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};

  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    this._mapper = styleMapper;
    this._defaultStyles = defaultStyles || {};
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    // Convert our intermediate representation into an array of docx children.
    const childrenArrays = await Promise.all(
      elements.map((el) => this.convertElement(el))
    );
    const children = childrenArrays.flat();

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
                text: '•',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 240, hanging: 240 } } },
              },
              {
                level: 1,
                format: NumberFormat.BULLET,
                text: '◦',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 } } },
              },
              {
                level: 2,
                format: NumberFormat.BULLET,
                text: '▪',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 240 } } },
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
                style: { paragraph: { indent: { left: 240, hanging: 240 } } },
              },
              {
                level: 1,
                format: NumberFormat.DECIMAL,
                text: '%2.',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 } } },
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
    if (typeof window !== 'undefined') {
      return await Packer.toBlob(doc);
    } else {
      return await Packer.toBuffer(doc);
    }
  }

  private handlers: Record<
    string,
    (
      el: DocumentElement,
      styles: { [key: string]: string | number }
    ) => Promise<
      | Paragraph
      | Table
      | TextRun
      | ImageRun
      | ExternalHyperlink
      | (Paragraph | Table | TextRun | ImageRun | ExternalHyperlink)[]
    >
  > = {
    paragraph: this.convertParagraph.bind(this),
    heading: this.convertHeading.bind(this),
    list: this.convertList.bind(this),
    line: this.convertLine.bind(this),
    image: this.convertImage.bind(this),
    table: this.convertTable.bind(this),
    text: this.convertText.bind(this),
    custom: this.convertParagraph.bind(this), // fallback
  };

  private inlineHandlers: Record<
    string,
    (
      el: DocumentElement,
      styles: { [key: string]: string | number }
    ) => Promise<
      | TextRun
      | ImageRun
      | ExternalHyperlink
      | (TextRun | ImageRun | ExternalHyperlink)[]
    >
  > = {
    text: this.convertText.bind(this),
    image: this.convertImage.bind(this),
  };

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private async convertElement(
    el: DocumentElement
  ): Promise<(Paragraph | Table)[]> {
    switch (el.type) {
      case 'paragraph':
        return [...(await this.convertParagraph(el as ParagraphElement))];

      case 'heading':
        return [await this.convertHeading(el as HeadingElement)];

      case 'list':
        return await this.convertList(el as ListElement);

      case 'line':
        return await this.convertLine(el as LineElement);

      case 'image':
        return [
          new Paragraph({
            children: [await this.convertImage(el as ImageElement)],
          }),
        ];

      case 'table':
        return [await this.convertTable(el as TableElement)];

      default:
        return [...(await this.convertParagraph(el as ParagraphElement))];
    }
  }

  private async convertParagraph(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<(Paragraph | Table)[]> {
    const el = _el as ParagraphElement;
    // If there are nested inline children, create multiple text runs.
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };
    if (el.content && el.content.length > 0) {
      let prevChild: Paragraph | Table | TextRun | ImageRun | ExternalHyperlink;
      const childResults = await handleChildren(
        this.handlers,
        el.content,
        mergedStyles,
        styles ?? {},
        el.styles ?? {}
      );
      return childResults.reduce<(Paragraph | Table)[]>(
        (acc, child, currentIndex) => {
          const isPreviousInline =
            currentIndex > 0 && prevChild && isInline(prevChild);
          if (isPreviousInline && isInline(child)) {
            if (Array.isArray(child)) {
              child.forEach((c) => {
                acc[acc.length - 1].addChildElement(c);
              });
            } else {
              acc[acc.length - 1].addChildElement(child);
            }
          } else if (isInline(child)) {
            acc.push(
              new Paragraph({
                run: { ...this._mapper.mapStyles(mergedStyles, el) },
                children: Array.isArray(child) ? [...child] : [child],
                ...this._mapper.mapStyles(mergedStyles, el),
              })
            );
          } else if (child instanceof ImageRun) {
            acc.push(
              new Paragraph({
                children: [child],
                ...this._mapper.mapStyles(mergedStyles, el),
              })
            );
          } else {
            acc.push(child as Paragraph | Table);
          }
          prevChild = child;
          return acc;
        },
        []
      );
    }
    // Otherwise, if no nested children, simply create one TextRun.
    return [
      new Paragraph({
        ...this._mapper.mapStyles(mergedStyles, el),
        children: [
          new TextRun({
            text: el.text || '',
            ...this._mapper.mapStyles(mergedStyles, el),
          }),
        ],
      }),
    ];
  }

  private async convertLine(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<Paragraph[]> {
    const el = _el as LineElement;
    // If there are nested inline children, create multiple text runs.
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };
    return [
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6, // Thickness of the line (in eighths of a point)
            color: '808080', // Color can be set explicitly, e.g., "000000"
            space: 1, // Space between the text (if any) and the line
          },
        },
        ...this._mapper.mapStyles(mergedStyles, el),
      }),
    ];
  }

  private async convertHeading(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<Paragraph> {
    const el = _el as HeadingElement;
    const level = el.level && el.level >= 1 && el.level <= 6 ? el.level : 1;
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };

    if (el.content && el.content.length > 0) {
      const children = await handleChildren(
        this.handlers,
        el.content,
        mergedStyles,
        styles ?? {},
        el.styles ?? {}
      );

      // @To-do: This may not work well in case of overlap... Check how to separate inline from block styles
      return new Paragraph({
        heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
        children,
        run: {
          ...this._mapper.mapStyles(mergedStyles, el),
        },
        ...this._mapper.mapStyles(mergedStyles, el),
      });
    }

    return new Paragraph({
      heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
      children: [
        new TextRun({
          text: el.text,
          color: '000000',
          ...this._mapper.mapStyles(mergedStyles, el),
        }),
      ],
      ...this._mapper.mapStyles(mergedStyles, el),
    });
  }

  private async convertText(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<(TextRun | ImageRun | ExternalHyperlink)[]> {
    const el = _el as TextElement;
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };
    if (el.content && el.content.length > 0) {
      const allChildren = await handleChildren(
        this.inlineHandlers,
        el.content,
        mergedStyles,
        styles ?? {},
        el.styles ?? {}
      );
      // Only allow inline elements
      return allChildren.filter(
        (c): c is TextRun | ImageRun | ExternalHyperlink =>
          c instanceof TextRun ||
          c instanceof ImageRun ||
          c instanceof ExternalHyperlink
      );
    }
    if (el.attributes?.href) {
      const { href } = el.attributes!;
      return [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: el.text || '',
              ...this._mapper.mapStyles(mergedStyles, el),
              style: 'Hyperlink',
            }),
          ],
          link: href as string,
        }),
      ];
    }
    return [
      new TextRun({
        text: el.text || '',
        break: (el.metadata?.break as number) || undefined,
        ...this._mapper.mapStyles(mergedStyles, el),
      }),
    ];
  }

  private async convertList(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<Paragraph[]> {
    const el = _el as ListElement;
    const mergedStyles = { ...this._defaultStyles?.[el.type] };
    return (
      await Promise.all(
        el.content.map((child) => {
          child['metadata'] = {
            ...child['metadata'],
            reference: `${el.listType}${
              el.markerStyle && el.markerStyle !== ''
                ? `-${el.markerStyle}`
                : ''
            }`,
          };
          return this._convertListItem(child, {
            ...mergedStyles,
            ...styles,
            ...el.styles,
          });
        })
      )
    ).flat();
  }

  private async _convertListItem(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<Paragraph[]> {
    const el = _el as ListItemElement;
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };
    // If there are nested inline children, create multiple text runs.
    if (el.content && el.content.length > 0) {
      // Merge parent's styles into each child (child style overrides parent's if provided)
      let prevChild: Paragraph | Table | TextRun | ImageRun | ExternalHyperlink;
      const childResults = await handleChildren(
        this.handlers,
        el.content,
        mergedStyles,
        styles ?? {},
        el.styles ?? {}
      );
      return childResults.reduce<Paragraph[]>((acc, child, currentIndex) => {
        const isPreviousInline =
          currentIndex > 0 && prevChild && isInline(prevChild);
        if (isPreviousInline && isInline(child)) {
          acc[acc.length - 1].addChildElement(child);
        } else if (isInline(child)) {
          acc.push(
            new Paragraph({
              numbering: {
                reference: (el.metadata?.reference as string) || '',
                level: el.level,
              },
              run: {
                ...this._mapper.mapStyles(mergedStyles, el),
              },
              children: [child],
              ...this._mapper.mapStyles(mergedStyles, el),
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
          reference: (el.metadata?.reference as string) || '',
          level: el.level,
        },
        run: {
          ...this._mapper.mapStyles(mergedStyles, el),
        },
        children: [
          new TextRun({
            text: el.text,
            ...this._mapper.mapStyles(mergedStyles, el),
          }),
        ],
      }),
    ];
  }

  // Note: Ensure this function can use asynchronous operations
  private async convertImage(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<ImageRun> {
    const el = _el as ImageElement;
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };

    let dataBuffer: Buffer | Uint8Array | undefined;
    let imageType: IImageOptions['type'] = 'png'; // default type

    const src = el.src || '';
    if (!src) {
      throw new Error('No src defined for image.');
    }

    if (src.startsWith('data:')) {
      // Handle data URIs in the form:
      //   data:[<MIME-type>][;base64],<data>
      const matches = src.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
      if (!matches || matches.length < 3) {
        throw new Error('Invalid data URI');
      }
      imageType = matches[1].split('/')[1] as IImageOptions['type']; // e.g. "image/png" becomes "png"
      const base64Data = matches[2];
      dataBuffer = toBinaryBuffer(base64Data, 'base64');
    } else if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('//')
    ) {
      // Handle external URLs: fetch the image data.
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${src}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      dataBuffer = toBinaryBuffer(arrayBuffer);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        imageType = contentType.split('/')[1] as IImageOptions['type'];
      }
    } else if (typeof window === 'undefined') {
      // Assume it's a local file path.
      // This code path is only supported in Node environments.
      const fs = import('fs');
      const path = import('path');
      if (!(await fs).default.existsSync(src)) {
        throw new Error(`File not found: ${src}`);
      }
      dataBuffer = (await fs).default.readFileSync(src);
      imageType =
        ((await path).default.extname(src).slice(1) as IImageOptions['type']) ||
        'png';
    }

    if (!dataBuffer) {
      throw new Error('Image data could not be loaded.');
    }
    // Ensure dataBuffer is Buffer (Node) or Uint8Array (browser)
    if (typeof Buffer !== 'undefined' && !(dataBuffer instanceof Buffer)) {
      dataBuffer = Buffer.from(dataBuffer);
    } else if (
      typeof Buffer === 'undefined' &&
      !(dataBuffer instanceof Uint8Array)
    ) {
      dataBuffer = new Uint8Array(dataBuffer) as Buffer;
    }

    // Add fallback for SVGs
    if (imageType === 'svg') {
      // 1x1 transparent PNG fallback
      const fallbackBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9w8rKQAAAABJRU5ErkJggg==';
      const fallback = toBinaryBuffer(fallbackBase64, 'base64');
      return new ImageRun({
        data: dataBuffer!,
        transformation: { width: 100, height: 100 },
        type: imageType,
        fallback: { data: fallback, type: 'png' },
        ...this._mapper.mapStyles(mergedStyles, el),
      });
    }
    return new ImageRun({
      data: dataBuffer!,
      transformation: { width: 100, height: 100 },
      type: imageType,
      ...this._mapper.mapStyles(mergedStyles, el),
    });
  }

  private async convertTable(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<Table> {
    const el = _el as TableElement;
    const mergedStyles = {
      ...(this._defaultStyles?.[el.type] ?? {}),
      ...styles,
      ...el.styles,
    };

    const numRows = el.rows.length;

    let numCols = 0;

    for (const row of el.rows) {
      let colCount = 0;
      for (const cell of row.cells) {
        colCount += cell.colspan ? cell.colspan : 1;
      }
      numCols = Math.max(numCols, colCount);
    }

    const grid: (GridCell | null)[][] = Array.from({ length: numRows }, () => {
      return Array(numCols).fill(null);
    });

    for (let i = 0; i < numRows; i++) {
      let colIndex = 0;
      const row = el.rows[i];

      for (const cell of row.cells) {
        while (colIndex < numCols && grid[i][colIndex] !== null) colIndex++;
        if (colIndex >= numCols) break;
        const colSpan = cell.colspan || 1;
        const rowSpan = cell.rowspan || 1;

        grid[i][colIndex] = {
          cell,
          horizontal: false,
          verticalMerge: false,
          isMaster: true,
        };

        // Mark for horizontal merges
        for (let k = 1; k < colSpan; k++) {
          grid[i][colIndex + k] = {
            cell,
            horizontal: true,
            verticalMerge: false,
            isMaster: false,
          };
        }

        // Mark for vertical merge
        if (rowSpan > 1) {
          for (let r = i + 1; r < i + rowSpan && r < numRows; r++) {
            grid[r][colIndex] = {
              cell,
              horizontal: false,
              verticalMerge: true,
              isMaster: false,
            };
          }
          colIndex += colSpan;
        }
      }
    }
    // Build the TableRows objects
    const tableRows: TableRow[] = [];
    for (let i = 0; i < numRows; i++) {
      const cells: TableCell[] = [];
      let j = 0;
      while (j < numCols) {
        const gridCell = grid[i][j];
        if (!gridCell) {
          cells.push(
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '' })],
                }),
              ],
            })
          );
          j++;
        } else if (gridCell.horizontal) {
          j++;
          continue;
        } else if (gridCell.verticalMerge) {
          cells.push(
            new TableCell({
              verticalMerge: 'continue',
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '' })],
                }),
              ],
            })
          );
          j++;
        } else {
          const originalCell = gridCell.cell;
          const colSpan = originalCell?.colspan ? originalCell.colspan : 1;
          const rowSpan = originalCell?.rowspan ? originalCell.rowspan : 1;
          const verticalMerge = rowSpan > 1 ? 'restart' : undefined;
          let prevChild:
            | Paragraph
            | Table
            | TextRun
            | ImageRun
            | ExternalHyperlink;
          const cellContent: (Paragraph | Table)[] =
            originalCell?.content && originalCell.content?.length > 0
              ? (
                  await handleChildren(this.handlers, originalCell.content, {
                    ...this._defaultStyles?.[originalCell?.type],
                    ...styles,
                    ...originalCell.styles,
                  })
                ).reduce<(Paragraph | Table)[]>((acc, child, currentIndex) => {
                  const isPreviousInline =
                    currentIndex > 0 && prevChild && isInline(prevChild);
                  if (isPreviousInline && isInline(child)) {
                    if (Array.isArray(child)) {
                      child.forEach((c) => {
                        acc[acc.length - 1].addChildElement(c);
                      });
                    } else {
                      acc[acc.length - 1].addChildElement(child);
                    }
                  } else if (isInline(child)) {
                    acc.push(
                      new Paragraph({
                        run: {
                          ...this._mapper.mapStyles(
                            {
                              ...originalCell.styles,
                              ...mergedStyles,
                            },
                            originalCell
                          ),
                        },
                        children: Array.isArray(child) ? [...child] : [child],
                        ...this._mapper.mapStyles(
                          {
                            ...originalCell.styles,
                            ...mergedStyles,
                          },
                          originalCell
                        ),
                      })
                    );
                  } else {
                    acc.push(child as Paragraph | Table);
                  }
                  prevChild = child;
                  return acc;
                }, [])
              : [new Paragraph('')];
          cells.push(
            new TableCell({
              children: cellContent,
              columnSpan: colSpan > 1 ? colSpan : undefined,
              verticalMerge: verticalMerge,
              verticalAlign: VerticalAlign.CENTER,
              ...this._mapper.mapStyles(
                {
                  ...(originalCell
                    ? this._defaultStyles?.[originalCell.type]
                    : {}),
                  ...originalCell?.styles,
                },
                originalCell!
              ),
            })
          );
          j += colSpan;
        }
      }
      const rowStyles = el.rows[i].styles || {};
      tableRows.push(
        new TableRow({
          children: cells,
          ...this._mapper.mapStyles(
            {
              ...(this._defaultStyles?.['table-row'] ?? {}),
              ...mergedStyles,
              ...rowStyles,
            },
            el
          ),
        })
      );
    }
    return new Table({
      rows: tableRows,
      ...this._mapper.mapStyles({ ...mergedStyles, ...el.styles }, el),
    });
  }
}
