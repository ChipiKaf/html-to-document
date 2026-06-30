import { createBaseParagraphElement } from '../../docx-stylesheet';
import {
  BorderStyle,
  type FileChild,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
} from 'docx';
import {
  type AttributeElement,
  cascadeStyles,
  computeInheritedStyles,
  type DocumentElement,
  filterForScope,
  type GridCell,
  type Styles,
  type TableElement,
} from 'html-to-document-core';
import type { ElementConverterDependencies, IBlockConverter } from '../types';

type DocumentElementType = TableElement;

/**
 * Returns true if the given CSS styles declare `hidden` on the specified border side.
 * Per CSS, `border-style: hidden` has the highest priority in border conflict resolution
 * and suppresses adjacent visible borders in a collapsed-border table.
 */
const isBorderSideHidden = (
  styles: Styles,
  side: 'Top' | 'Right' | 'Bottom' | 'Left'
): boolean => {
  const sideVal = styles[`border${side}Style` as keyof Styles];
  if (sideVal !== undefined) return sideVal === 'hidden';
  // Consider removing the following checks as we may assume the styles to already be expanded
  const globalVal = styles.borderStyle;
  if (globalVal !== undefined) return globalVal === 'hidden';
  const border = styles.border;
  if (border !== undefined) return /\bhidden\b/.test(String(border));
  return false;
};

export class TableConverter implements IBlockConverter<DocumentElementType> {
  public isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'table';
  }

  public async convertElement(
    dependencies: ElementConverterDependencies,
    element: TableElement,
    cascadedStyles?: Styles
  ): Promise<FileChild[]> {
    const { styleMapper, converter, defaultStyles, stylesheet, styleMeta } =
      dependencies;
    const captions: { side: string; paragraph: Paragraph }[] = [];

    // We filter the cascaded styles for the table scope
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, cascadedStyles),
    };
    const cascadingStyles = cascadeStyles(
      mergedStyles,
      element.scope,
      styleMeta
    );

    // --- begin colgroup support ---
    let stylesCol: Record<string, unknown>[] = [];
    if (Array.isArray(element.metadata?.colgroup)) {
      const [colgroupMeta] = element.metadata.colgroup as AttributeElement[];
      stylesCol =
        (colgroupMeta?.metadata as { col: DocumentElement[] })?.col.map(
          (col) => {
            return styleMapper.mapStyles(
              {
                ...defaultStyles?.[col.type],
                ...stylesheet.getComputedStyles(col, cascadingStyles),
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
              ...defaultStyles?.[c.type],
              ...stylesheet.getComputedStyles(c, cascadingStyles),
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
                  stylesheet,
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

    const effectiveNumCols = Math.max(numCols, 1);

    const grid: (GridCell | null)[][] = Array.from({ length: numRows }, () => {
      return Array(effectiveNumCols).fill(null);
    });

    for (let i = 0; i < numRows; i++) {
      let colIndex = 0;
      const row = element.rows[i];
      if (!row) continue;

      for (const cell of row.cells) {
        const currentRow = grid[i]!;
        while (colIndex < effectiveNumCols && currentRow[colIndex] !== null)
          colIndex++;
        if (colIndex >= effectiveNumCols) break;
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

    // Helper to get the merged raw CSS styles for any grid cell (used for adjacent hidden resolution)
    const getGridCellRawStyles = (
      gridCell: (typeof grid)[0][0] | undefined
    ): Styles | null => {
      if (!gridCell?.cell) return null;
      return {
        ...(defaultStyles?.[gridCell.cell.type] ?? {}),
        ...stylesheet.getMatchedStyles(gridCell.cell),
        ...gridCell.cell.styles,
      } as Styles;
    };

    const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };

    // Build the TableRows objects
    const tableRows: TableRow[] = [];
    for (let i = 0; i < numRows; i++) {
      const cells: TableCell[] = [];
      let j = 0;
      while (j < effectiveNumCols) {
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
          const originalCellMatchedStyles = originalCell
            ? {
                ...defaultStyles?.[originalCell.type],
                ...stylesheet.getMatchedStyles(originalCell),
              }
            : {};
          const cascadedCellStyles = originalCell
            ? computeInheritedStyles({
                parentStyles: {
                  ...originalCellMatchedStyles,
                  ...stylesCol[j],
                  ...originalCell.styles,
                },
                parentScope: 'tableCell',
                childScope: 'block',
                metaRegistry: styleMeta,
              })
            : {};

          const cellContent = originalCell
            ? converter.convertToBlocks({
                element: originalCell,
                stylesheet,
                cascadedStyles: cascadedCellStyles,
                wrapInlineElements: (inlines) => {
                  return [
                    new Paragraph({
                      children: inlines,
                      ...styleMapper.mapStyles(
                        filterForScope(cascadedCellStyles, 'block', styleMeta),
                        createBaseParagraphElement()
                      ),
                    }),
                  ];
                },
              })
            : [new Paragraph('')];
          const docxCellStyles = styleMapper.mapStyles(
            {
              ...(originalCell
                ? {
                    ...stylesheet?.getMatchedStyles(originalCell),
                    ...defaultStyles?.[originalCell.type],
                  }
                : {}),
              ...originalCell?.styles,
            },
            originalCell!
          ) as Record<string, unknown>;

          // CSS collapsed border model: border-style: hidden on a neighbour always wins.
          // If an adjacent cell declares hidden on its shared side, suppress our border there.
          const adjacencyOverrides: Record<string, unknown> = {};
          const rightNeighbor = getGridCellRawStyles(grid[i]?.[j + colSpan]);
          if (rightNeighbor && isBorderSideHidden(rightNeighbor, 'Left')) {
            adjacencyOverrides.right = NONE_BORDER;
          }
          const leftNeighbor =
            j > 0 ? getGridCellRawStyles(grid[i]?.[j - 1]) : null;
          if (leftNeighbor && isBorderSideHidden(leftNeighbor, 'Right')) {
            adjacencyOverrides.left = NONE_BORDER;
          }
          const bottomNeighbor = getGridCellRawStyles(grid[i + rowSpan]?.[j]);
          if (bottomNeighbor && isBorderSideHidden(bottomNeighbor, 'Top')) {
            adjacencyOverrides.bottom = NONE_BORDER;
          }
          const topNeighbor =
            i > 0 ? getGridCellRawStyles(grid[i - 1]?.[j]) : null;
          if (topNeighbor && isBorderSideHidden(topNeighbor, 'Bottom')) {
            adjacencyOverrides.top = NONE_BORDER;
          }
          if (Object.keys(adjacencyOverrides).length > 0) {
            const existing = (docxCellStyles.borders ?? {}) as Record<
              string,
              unknown
            >;
            docxCellStyles.borders = { ...existing, ...adjacencyOverrides };
          }

          const newCell = new TableCell({
            // TODO: make concurrent iterations
            children: await cellContent,
            columnSpan: colSpan > 1 ? colSpan : undefined,
            verticalMerge: verticalMerge,
            verticalAlign: VerticalAlign.CENTER,
            ...stylesCol[j],
            ...docxCellStyles,
          });
          cells.push(newCell);
          j += colSpan;
        }
      }
      const rowElement = element.rows[i];
      // TODO: cascaded styles?
      const rowStyles = rowElement
        ? stylesheet.getComputedStyles(rowElement, undefined)
        : undefined;
      tableRows.push(
        new TableRow({
          children: cells,
          ...styleMapper.mapStyles(
            {
              ...(rowElement ? defaultStyles?.[rowElement?.type] : {}),
              ...rowStyles,
            },
            rowElement ?? element
          ),
        })
      );
    }

    // Drop table if it has no rows
    if (tableRows.length === 0) {
      // TODO: return captions?
      return [];
    }

    const rawStyles = styleMapper.mapStyles(
      { ...mergedStyles, ...element.styles },
      element
    );

    // HTML default: tables have no visible borders unless explicitly styled.
    // The docx library falls back to DEFAULT_BORDER (single, size 4) for every
    // unspecified side in TableBorders — including insideH/V — so we must
    // always supply an explicit all-none set and let CSS values override it.
    const tableBorders = {
      top: NONE_BORDER,
      bottom: NONE_BORDER,
      left: NONE_BORDER,
      right: NONE_BORDER,
      insideHorizontal: NONE_BORDER,
      insideVertical: NONE_BORDER,
      ...((rawStyles.borders as Record<string, unknown> | undefined) ?? {}),
    };

    return [
      ...captions.filter((c) => c.side === 'top').map((c) => c.paragraph),
      new Table({
        ...rawStyles,
        borders: tableBorders,
        rows: tableRows,
      }),
      ...captions.filter((c) => c.side === 'bottom').map((c) => c.paragraph),
    ];
  }
}
