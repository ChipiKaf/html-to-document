import {
  AttributeElement,
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

  public convertEement(
    dependencies: ElementConverterDependencies,
    element: TableElement,
    cascadedStyles?: Styles
  ): FileChild[] {
    const { styleMapper, converter, defaultStyles } = dependencies;
    const captions: { side: string; paragraph: Paragraph }[] = [];
    const mergedStyles = {
      ...(defaultStyles?.[element.type] ?? {}),
      ...cascadedStyles,
      ...element.styles,
    };

    // --- begin colgroup support ---
    // let widths: ITableWidthProperties[] = [];
    let stylesCol: Record<string, unknown>[] = [];
    if (Array.isArray(element.metadata?.colgroup)) {
      const [colgroupMeta] = element.metadata.colgroup as AttributeElement[];
      stylesCol =
        (colgroupMeta?.metadata as { col: DocumentElement[] })?.col.map(
          (col) => {
            return styleMapper.mapStyles(col.styles || {}, col);
          }
        ) ?? [];
    }

    if (Array.isArray(element.metadata?.caption)) {
      const caption = element.metadata.caption as AttributeElement[];
      captions.push(
        ...caption.map((c) => ({
          side: (c.styles?.captionSide || 'top') as string,
          paragraph: new Paragraph({
            // children: [
            //   new TextRun({
            //     text: c.text,
            //     ...styleMapper.mapStyles(c.styles || {}, c),
            //   }),
            // ],
            children: converter.convertInline(c, c.styles),
            ...styleMapper.mapStyles(c.styles || {}, c),
          }),
        }))
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
                cascadedStyles: {
                  ...defaultStyles?.[originalCell.type],
                  ...stylesCol[j],
                  ...originalCell.styles,
                },
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
              children: cellContent,
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
      const rowStyles = element.rows[i]?.styles || {};
      tableRows.push(
        new TableRow({
          children: cells,
          ...styleMapper.mapStyles(
            {
              ...(defaultStyles?.['table-row'] ?? {}),
              // ...mergedStyles,
              ...rowStyles,
            },
            element
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
