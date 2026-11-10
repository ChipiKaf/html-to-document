import type { Styles } from 'html-to-document-core';
import type { PlacedCell, TableGrid } from './grid';
import type { TableStyles } from './styles';

export type Side = 'top' | 'right' | 'bottom' | 'left';

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

const CSS_SIDE: Record<Side, 'Top' | 'Right' | 'Bottom' | 'Left'> = {
  top: 'Top',
  right: 'Right',
  bottom: 'Bottom',
  left: 'Left',
};

/**
 * Resolves the edges a cell shares with its neighbours and the table, following
 * the CSS collapsed border model:
 *
 * - An edge between two of the rows a cell spans is inside the cell, so it has
 *   no border. Word draws each row of a vertically merged cell separately, so
 *   these edges are turned off explicitly.
 * - `border-style: hidden` on the other side of an edge, on a neighbouring cell
 *   or on the table at the table's edge, wins over every other border and
 *   suppresses the edge. A neighbour along any part of an edge is enough, since
 *   Word can't draw only part of a cell's side; the other neighbours along the
 *   edge still draw their own borders there.
 * - `border-style: none` on the other side has the lowest priority, so it leaves
 *   this cell's border as it is. Word then draws the visible one of the two.
 *
 * A cell's own `hidden` or `none` sides are written as none by the style mapper.
 */
export class CollapsedBorders {
  public constructor(
    private readonly grid: TableGrid,
    private readonly styles: TableStyles
  ) {}

  /** Returns the sides of a cell, in one of the rows it covers, that must not draw a border. */
  public getSuppressedSides(placed: PlacedCell, row: number): Side[] {
    return SIDES.filter((side) => {
      const facing = this.getFacingStyles(placed, row, side);
      if (facing === undefined) return true;
      return facing.some((styles) =>
        CollapsedBorders.isSideHidden(styles, OPPOSITE_SIDE[side])
      );
    });
  }

  /**
   * Returns the styles of the boxes on the other side of one side of a cell, in one
   * of the rows the cell covers: the cells across the edge, or the table at the
   * table's edge. Returns `undefined` for an edge inside the cell, between two of
   * the rows it spans, since that isn't an edge in CSS.
   */
  private getFacingStyles(
    placed: PlacedCell,
    row: number,
    side: Side
  ): Styles[] | undefined {
    const lastRow = placed.row + placed.rowSpan - 1;
    if (side === 'top' && row > placed.row) return undefined;
    if (side === 'bottom' && row < lastRow) return undefined;

    const across = CollapsedBorders.getSlotsAcross(placed, row, side);
    const atTableEdge =
      across.row < 0 ||
      across.row >= this.grid.rowCount ||
      across.fromCol < 0 ||
      across.fromCol >= this.grid.colCount;
    if (atTableEdge) return [this.styles.table];

    const neighbours = new Set<PlacedCell>();
    for (let col = across.fromCol; col < across.toCol; col++) {
      const neighbour = this.grid.at(across.row, col);
      if (neighbour) neighbours.add(neighbour);
    }
    return [...neighbours].map((neighbour) =>
      this.styles.getCellStyles(neighbour)
    );
  }

  /** The slots on the other side of one side of a cell, in one of its rows. */
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

  /**
   * Returns true if the given CSS styles declare `hidden` on the specified border side.
   * Per CSS, `border-style: hidden` has the highest priority in border conflict resolution
   * and suppresses adjacent visible borders in a collapsed-border table.
   */
  private static isSideHidden(styles: Styles, side: Side): boolean {
    const sideVal = styles[`border${CSS_SIDE[side]}Style` as keyof Styles];
    if (sideVal !== undefined) return sideVal === 'hidden';
    // Consider removing the following checks as we may assume the styles to already be expanded
    const globalVal = styles.borderStyle;
    if (globalVal !== undefined) return globalVal === 'hidden';
    const border = styles.border;
    if (border !== undefined) return /\bhidden\b/.test(String(border));
    return false;
  }
}
