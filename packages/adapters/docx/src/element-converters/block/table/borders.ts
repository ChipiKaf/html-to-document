import type { Styles } from 'html-to-document-core';
import type { PlacedCell, Side, TableGrid } from './grid';
import type { TableStyles } from './styles';

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
      const across = this.grid.getAcross(placed, row, side);
      switch (across.kind) {
        case 'inside':
          return true;
        case 'table':
          return CollapsedBorders.isSideHidden(this.styles.table, side);
        case 'cells':
          return across.cells.some((neighbour) =>
            CollapsedBorders.isSideHidden(
              this.styles.getCellStyles(neighbour),
              OPPOSITE_SIDE[side]
            )
          );
      }
    });
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
