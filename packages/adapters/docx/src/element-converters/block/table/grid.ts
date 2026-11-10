import type { TableCellElement, TableRowElement } from 'html-to-document-core';

/** A cell placed in the table grid, with the block of slots it covers. */
export interface PlacedCell {
  cell: TableCellElement;
  /** The first row the cell covers. */
  row: number;
  /** The first column the cell covers. */
  col: number;
  /** The number of rows the cell covers, cut off at the last row of the table. */
  rowSpan: number;
  /** The number of columns the cell covers. */
  colSpan: number;
}

/**
 * What a row of the grid holds in each column, skipping the columns a cell spans
 * after its first one:
 * - `start`: the first row of a cell.
 * - `continuation`: a later row of a cell spanning rows.
 * - `empty`: a slot no cell covers, as in a row with fewer cells than the table.
 */
export type RowSlot =
  | { kind: 'start'; col: number; placed: PlacedCell }
  | { kind: 'continuation'; col: number; placed: PlacedCell }
  | { kind: 'empty'; col: number };

const toSpan = (span: number | undefined): number =>
  span && span > 0 ? Math.floor(span) : 1;

/**
 * The layout of a table: which cell covers each slot of the grid, following the
 * HTML table model. Each cell takes the first column in its row that no cell
 * above covers, and covers `colspan` × `rowspan` slots. Rows spanned from above
 * push the cells of the spanned rows to the right, and the grid grows as wide as
 * its widest row.
 *
 * If cells overlap (a table model error in HTML), the earlier cell keeps the
 * slots they share.
 */
export class TableGrid {
  public readonly rowCount: number;
  public readonly colCount: number;
  /** The cells in document order. */
  public readonly cells: readonly PlacedCell[];
  private readonly slots: (PlacedCell | undefined)[][];

  public constructor(rows: readonly TableRowElement[]) {
    this.slots = rows.map(() => []);
    this.cells = rows.flatMap((row, rowIndex) => this.placeRow(rows, rowIndex));
    this.rowCount = rows.length;
    this.colCount = Math.max(1, ...this.slots.map((slots) => slots.length));
  }

  /** Returns the cell covering a slot, or `undefined` for an empty or out-of-range slot. */
  public at(row: number, col: number): PlacedCell | undefined {
    return this.slots[row]?.[col];
  }

  /** Lists what a row holds, from the first column to the last. */
  public getRowSlots(row: number): RowSlot[] {
    const result: RowSlot[] = [];
    let col = 0;
    while (col < this.colCount) {
      const placed = this.at(row, col);
      if (!placed) {
        result.push({ kind: 'empty', col });
        col++;
        continue;
      }
      result.push({
        kind: placed.row === row ? 'start' : 'continuation',
        col,
        placed,
      });
      col = placed.col + placed.colSpan;
    }
    return result;
  }

  /** Places the cells of a row in the first free slots, and marks the slots they cover. */
  private placeRow(
    rows: readonly TableRowElement[],
    rowIndex: number
  ): PlacedCell[] {
    const rowSlots = this.slots[rowIndex]!;
    const placedCells: PlacedCell[] = [];
    let col = 0;
    for (const cell of rows[rowIndex]!.cells) {
      while (rowSlots[col]) col++;
      const placed: PlacedCell = {
        cell,
        row: rowIndex,
        col,
        rowSpan: Math.min(toSpan(cell.rowspan), rows.length - rowIndex),
        colSpan: toSpan(cell.colspan),
      };
      placedCells.push(placed);

      for (let r = rowIndex; r < rowIndex + placed.rowSpan; r++) {
        for (let c = col; c < col + placed.colSpan; c++) {
          this.slots[r]![c] ??= placed;
        }
      }
      col += placed.colSpan;
    }
    return placedCells;
  }
}
