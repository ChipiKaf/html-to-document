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

export type Side = 'top' | 'right' | 'bottom' | 'left';

/**
 * What is across one side of a cell, in one of the rows it covers:
 * - `inside`: nothing, since the edge is between two of the rows the cell spans,
 *   which isn't an edge in CSS.
 * - `table`: the table's edge.
 * - `cells`: the cells across the edge, one for each that covers part of it. None
 *   when the slots across are empty.
 */
export type Across =
  | { kind: 'inside' }
  | { kind: 'table' }
  | { kind: 'cells'; cells: PlacedCell[] };

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

  /** Returns what is across one side of a cell, in one of the rows it covers. */
  public getAcross(placed: PlacedCell, row: number, side: Side): Across {
    const lastRow = placed.row + placed.rowSpan - 1;
    if (side === 'top' && row > placed.row) return { kind: 'inside' };
    if (side === 'bottom' && row < lastRow) return { kind: 'inside' };

    const across = TableGrid.getSlotsAcross(placed, row, side);
    const atTableEdge =
      across.row < 0 ||
      across.row >= this.rowCount ||
      across.fromCol < 0 ||
      across.fromCol >= this.colCount;
    if (atTableEdge) return { kind: 'table' };

    const cells = new Set<PlacedCell>();
    for (let col = across.fromCol; col < across.toCol; col++) {
      const neighbour = this.at(across.row, col);
      if (neighbour) cells.add(neighbour);
    }
    return { kind: 'cells', cells: [...cells] };
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

  /** The slots across one side of a cell, in one of its rows. */
  private static getSlotsAcross(
    placed: PlacedCell,
    row: number,
    side: Side
  ): { row: number; fromCol: number; toCol: number } {
    const endCol = placed.col + placed.colSpan;
    switch (side) {
      case 'top':
        return { row: row - 1, fromCol: placed.col, toCol: endCol };
      case 'bottom':
        return { row: row + 1, fromCol: placed.col, toCol: endCol };
      case 'left':
        return { row, fromCol: placed.col - 1, toCol: placed.col };
      case 'right':
        return { row, fromCol: endCol, toCol: endCol + 1 };
    }
  }
}
