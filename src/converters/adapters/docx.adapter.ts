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
  GridCell,
  HeadingElement,
  ImageElement,
  ListElement,
  ListItemElement,
  ParagraphElement,
  TableCellElement,
  TableElement,
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

  private inlineHandlers: Record<
    string,
    (
      el: DocumentElement,
      styles: { [key: string]: string }
    ) => TextRun | ImageRun | (TextRun | ImageRun)[]
  > = {
    text: this.convertText.bind(this),
    image: this.convertImage.bind(this),
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
          return handler(child, { ...styles, ...el.styles });
        })
        .flat()
        .reduce<(Paragraph | Table)[]>((acc, child, currentIndex) => {
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
                  ...this._mapper.mapStyles(mergedStyles),
                },
                children: Array.isArray(child) ? [...child] : [child],
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
  ): (TextRun | ImageRun)[] {
    const el = _el as TextElement;
    const mergedStyles = { ...styles, ...el.styles };
    if (el.content && el.content.length > 0) {
      return el.content
        .map((child) => {
          const handler =
            this.inlineHandlers[child.type] || this.inlineHandlers.text;
          // Create a new TextRun with the merged styles and child's text.
          return handler(child, { ...styles, ...el.styles });
        })
        .flat();
    }
    return [
      new TextRun({
        text: el.text || '',
        ...this._mapper.mapStyles(mergedStyles),
      }),
    ];
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
  ): ImageRun {
    // For a real implementation, you might need to load the image from a URL or file.
    // Here we assume that el.src is a base64 encoded string for simplicity.
    // You also might want to use el.attributes to read width/height.
    const el = _el as ImageElement;
    const mergedStyles = { ...styles, ...el.styles };
    return new ImageRun({
      data: Buffer.from(el.src || '', 'base64'),
      transformation: { width: 100, height: 100 },
      type: 'png', // specify the image type (e.g. 'png', 'jpeg')
      ...this._mapper.mapStyles(mergedStyles),
    });
  }

  // private convertTable(
  //   _el: DocumentElement,
  //   styles: { [key: string]: any } = {}
  // ): Table {
  //   const el = _el as TableElement;
  //   const mergedStyles = { ...styles, ...el.styles };
  //   // Determine the number of rows.
  //   const numRows = el.rows.length;

  //   // Compute the maximum number of columns by summing colspans in each row.
  //   let numCols = 0;
  //   for (const row of el.rows) {
  //     let colCount = 0;
  //     for (const cell of row.cells) {
  //       colCount += cell.colspan ? cell.colspan : 1;
  //     }
  //     numCols = Math.max(numCols, colCount);
  //   }

  //   // Create a grid (2D array) to hold each cell or placeholder.
  //   const grid: (GridCell | null)[][] = Array.from({ length: numRows }, () =>
  //     Array(numCols).fill(null)
  //   );

  //   // Populate the grid with master cells and placeholders.
  //   for (let i = 0; i < numRows; i++) {
  //     let colIndex = 0;
  //     const row = el.rows[i];
  //     for (const cell of row.cells) {
  //       // Skip columns that are already occupied (by a rowspan from a previous row).
  //       // Skip columns that are already occupied (by a rowspan from a previous row).
  //       while (colIndex < numCols && grid[i][colIndex] !== null) {
  //         colIndex++;
  //       }
  //       // If we've exceeded the column count, break out of the loop.
  //       if (colIndex >= numCols) break;
  //       const colspan = cell.colspan ? cell.colspan : 1;
  //       const rowspan = cell.rowspan ? cell.rowspan : 1;

  //       // Place the master cell.
  //       grid[i][colIndex] = {
  //         cell: cell,
  //         horizontal: false,
  //         verticalMerge: false,
  //         isMaster: true,
  //       };

  //       // Mark horizontal placeholders for additional columns spanned by this cell.
  //       for (let k = 1; k < colspan; k++) {
  //         grid[i][colIndex + k] = {
  //           cell: cell,
  //           horizontal: true,
  //           verticalMerge: false,
  //           isMaster: false,
  //         };
  //       }

  //       // For vertical merging, mark a placeholder in subsequent rows for the first column of the cell.
  //       if (rowspan > 1) {
  //         for (let r = i + 1; r < i + rowspan && r < numRows; r++) {
  //           grid[r][colIndex] = {
  //             cell: cell,
  //             horizontal: false,
  //             verticalMerge: true,
  //             isMaster: false,
  //           };
  //         }
  //       }
  //       colIndex += colspan;
  //     }
  //   }

  //   // Build the TableRow objects.
  //   const tableRows: TableRow[] = [];
  //   for (let i = 0; i < numRows; i++) {
  //     const cells: TableCell[] = [];
  //     let j = 0;
  //     while (j < numCols) {
  //       const gridCell = grid[i][j];
  //       if (!gridCell) {
  //         // If there's a gap in the grid, insert an empty cell.
  //         cells.push(
  //           new TableCell({
  //             children: [new Paragraph('')],
  //           })
  //         );
  //         j++;
  //       } else if (gridCell.horizontal) {
  //         // Skip horizontal placeholders since they are already spanned by the master cell.
  //         j++;
  //         continue;
  //       } else if (gridCell.verticalMerge) {
  //         // For vertical merge placeholders, output a cell with verticalMerge set to "continue".
  //         cells.push(
  //           new TableCell({
  //             verticalMerge: 'continue',
  //             children: [new Paragraph('')],
  //           })
  //         );
  //         j++;
  //       } else {
  //         // For a master cell, use its colspan and set verticalMerge to "restart" if needed.
  //         const originalCell = gridCell.cell!;
  //         const colspan = originalCell.colspan ? originalCell.colspan : 1;
  //         const rowspan = originalCell.rowspan ? originalCell.rowspan : 1;
  //         const verticalMerge = rowspan > 1 ? 'restart' : undefined;
  //         let prevChild: Paragraph | Table | TextRun | ImageRun;

  //         // Convert the cell content.
  //         // (Assuming your TableCellElement has a "content" property similar to ParagraphElement.)
  //         const cellContent: (Paragraph | Table)[] =
  //           originalCell.content && originalCell.content.length > 0
  //             ? originalCell.content
  //                 .flatMap((child) =>
  //                   (this.handlers[child.type] || this.handlers.custom)(child, {
  //                     ...styles,
  //                     ...originalCell.styles,
  //                   })
  //                 )
  //                 .flat()
  //                 .reduce<(Paragraph | Table)[]>((acc, child, currentIndex) => {
  //                   const isPreviousInline =
  //                     currentIndex > 0 && prevChild && isInline(prevChild);

  //                   if (isPreviousInline && isInline(child)) {
  //                     if (Array.isArray(child)) {
  //                       child.forEach((c) => {
  //                         acc[acc.length - 1].addChildElement(c);
  //                       });
  //                     } else {
  //                       acc[acc.length - 1].addChildElement(child);
  //                     }
  //                   } else if (isInline(child)) {
  //                     acc.push(
  //                       new Paragraph({
  //                         run: {
  //                           ...this._mapper.mapStyles(mergedStyles),
  //                         },
  //                         children: Array.isArray(child) ? [...child] : [child],
  //                         ...this._mapper.mapStyles(mergedStyles),
  //                       })
  //                     );
  //                   } else {
  //                     acc.push(child as Paragraph | Table);
  //                   }

  //                   prevChild = child;

  //                   return acc;
  //                 }, [])
  //             : [new Paragraph('')];

  //         cells.push(
  //           new TableCell({
  //             children: cellContent,
  //             columnSpan: colspan > 1 ? colspan : undefined,
  //             verticalMerge: verticalMerge,
  //             ...this._mapper.mapStyles(originalCell.styles || {}),
  //           })
  //         );
  //         j += colspan;
  //       }
  //     }

  //     // Apply row-level styles if provided.
  //     const rowStyles = el.rows[i].styles || {};
  //     tableRows.push(
  //       new TableRow({
  //         children: cells,
  //         ...this._mapper.mapStyles(rowStyles),
  //       })
  //     );
  //   }
  //   // Return the constructed docx Table with any table-level styles applied.
  //   return new Table({
  //     rows: tableRows,
  //     ...this._mapper.mapStyles(el.styles || {}),
  //   });
  // }

  private convertTable(
    _el: DocumentElement,
    styles: { [key: string]: any } = {}
  ): Table {
    const el = _el as TableElement;
    const mergedStyles = { ...styles, ...el.styles };

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
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '' })],
                }),
              ],
            })
          );
          j++;
        }
      }
    }
  }
}
