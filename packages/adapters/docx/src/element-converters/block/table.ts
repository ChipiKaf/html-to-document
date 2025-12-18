import {
  AttributeElement,
  cascadeStyles,
  computeInheritedStyles,
  DocumentElement,
  GridCell,
  Styles,
  TableElement,
} from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';
import {
  FileChild,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
} from 'docx';

type DocumentElementType = TableElement;

export class TableConverter implements IBlockConverter<DocumentElementType> {
  public isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'table';
  }

  public async convertElement(
    dependencies: ElementConverterDependencies,
    element: TableElement,
    cascadedStyles?: Styles
  ): Promise<FileChild[]> {
    const { styleMapper, converter, defaultStyles, styleMeta } = dependencies;
    const captions: { side: string; paragraph: Paragraph }[] = [];

    // We filter the cascaded styles for the table scope
    const mergedStyles = {
      ...(defaultStyles?.[element.type] ?? {}),
      ...cascadedStyles,
      ...element.styles,
    };

    const cascadingStyles = cascadeStyles(
      mergedStyles,
      element.scope,
      styleMeta
    );

    // --- begin colgroup support ---
    // let widths: ITableWidthProperties[] = [];
    let stylesCol: Record<string, unknown>[] = [];
    if (Array.isArray(element.metadata?.colgroup)) {
      const [colgroupMeta] = element.metadata.colgroup as AttributeElement[];
      stylesCol =
        (colgroupMeta?.metadata as { col: DocumentElement[] })?.col.map(
          (col) => {
            return styleMapper.mapStyles(
              {
                ...cascadingStyles,
                ...(col.styles || {}),
              },
              col
            );
          }
        ) ?? [];
    }

    if (Array.isArray(element.metadata?.caption)) {
      const caption = element.metadata.caption as AttributeElement[];
      captions.push(
        ...(await Promise.all(
          caption.map(async (c) => {
            const innerMergedStyles = {
              ...cascadingStyles,
              ...(c.styles || {}),
            };
            const innerCascadingStyles = cascadeStyles(
              innerMergedStyles,
              c.scope,
              styleMeta
            );
            return {
              side: (c.styles?.captionSide || 'top') as string,
              paragraph: new Paragraph({
                children: await converter.convertInline(
                  c,
                  innerCascadingStyles
                ),
                ...styleMapper.mapStyles(innerMergedStyles, c),
              }),
            };
          })
        ))
      );
    }
    // --- end colgroup support ---
    const numRows = element.rows.length;

    let numCols = 0;

    for (const row of element.rows) {
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
      const row = element.rows[i];
      if (!row) continue;

      for (const cell of row.cells) {
        const currentRow = grid[i]!;
        while (colIndex < numCols && currentRow[colIndex] !== null) colIndex++;
        if (colIndex >= numCols) break;
        const colSpan = cell.colspan || 1;
        const rowSpan = cell.rowspan || 1;

        currentRow[colIndex] = {
          cell,
          horizontal: false,
          verticalMerge: false,
          isMaster: true,
        };

        // Mark for horizontal merges
        for (let k = 1; k < colSpan; k++) {
          currentRow[colIndex + k] = {
            cell,
            horizontal: true,
            verticalMerge: false,
            isMaster: false,
          };
        }

        // Mark for vertical merge
        if (rowSpan > 1) {
          for (let r = i + 1; r < i + rowSpan && r < numRows; r++) {
            const nextRow = grid[r]!;
            nextRow[colIndex] = {
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
        const gridCell = grid[i]?.[j];
        if (!gridCell) {
          cells.push(
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              ...(stylesCol[j] || {}),
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
          const cellContent = originalCell
            ? converter.convertToBlocks({
                element: originalCell,
                cascadedStyles: computeInheritedStyles({
                  parentStyles: {
                    ...defaultStyles?.[originalCell.type],
                    ...stylesCol[j],
                    ...originalCell.styles,
                  },
                  parentScope: 'tableCell',
                  childScope: 'block',
                  metaRegistry: styleMeta,
                }),
                wrapInlineElements: (inlines) => {
                  return [
                    new Paragraph({
                      children: inlines,
                      ...styleMapper.mapStyles(
                        {
                          ...(defaultStyles?.[originalCell.type] || {}),
                          ...stylesCol[j],
                          ...originalCell.styles,
                        },
                        originalCell
                      ),
                    }),
                  ];
                },
              })
            : [new Paragraph('')];

          cells.push(
            new TableCell({
              // TODO: make concurrent iterations
              children: await cellContent,
              columnSpan: colSpan > 1 ? colSpan : undefined,
              verticalMerge: verticalMerge,
              verticalAlign: VerticalAlign.CENTER,
              ...stylesCol[j],
              ...styleMapper.mapStyles(
                {
                  ...(originalCell ? defaultStyles?.[originalCell.type] : {}),
                  ...originalCell?.styles,
                },
                originalCell!
              ),
            })
          );
          j += colSpan;
        }
      }
      const rowElement = element.rows[i];
      const rowStyles = rowElement?.styles || {};
      tableRows.push(
        new TableRow({
          children: cells,
          ...styleMapper.mapStyles(
            {
              ...(defaultStyles?.['table-row'] ?? {}),
              // ...mergedStyles,
              ...rowStyles,
            },
            rowElement ?? element
          ),
        })
      );
    }
    const rawStyles = styleMapper.mapStyles(
      { ...mergedStyles, ...element.styles },
      element
    );

    return [
      ...captions.filter((c) => c.side === 'top').map((c) => c.paragraph),
      new Table({
        ...rawStyles,
        rows: tableRows,
      }),
      ...captions.filter((c) => c.side === 'bottom').map((c) => c.paragraph),
    ];
  }
}
