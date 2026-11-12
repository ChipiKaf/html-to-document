import { type FileChild, Table, TableCell, TableRow } from 'docx';
import type {
  DocumentElement,
  Styles,
  TableElement,
  TableRowElement,
} from 'html-to-document-core';
import type {
  ElementConverterDependencies,
  IBlockConverter,
} from '../../types';
import { CollapsedBorders } from './borders';
import { TableCaptions } from './captions';
import { TableCellBuilder } from './cells';
import { TableColumns } from './columns';
import { TableGrid } from './grid';
import { TableStyles } from './styles';

type DocumentElementType = TableElement;

/**
 * Converts a table by combining:
 * - `TableGrid` (`grid.ts`): the layout, which cell covers each slot and what is
 *   across each side of a cell, following the HTML table model.
 * - `TableStyles` (`styles.ts`): the CSS styles of the table, rows and cells, and
 *   their DOCX options.
 * - `CollapsedBorders` (`borders.ts`): which sides of a cell draw no border,
 *   from what the grid finds across them, following the CSS collapsed border
 *   model.
 * - `TableColumns` (`columns.ts`): the table's grid and the cells' column
 *   options, from `<colgroup>`.
 * - `TableCellBuilder` (`cells.ts`): the `TableCell` for each slot of a row.
 * - `TableCaptions` (`captions.ts`): the captions above and below the table.
 */
export class TableConverter implements IBlockConverter<DocumentElementType> {
  public isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'table';
  }

  public async convertElement(
    dependencies: ElementConverterDependencies,
    element: TableElement,
    cascadedStyles?: Styles
  ): Promise<FileChild[]> {
    const styles = new TableStyles(dependencies, element, cascadedStyles);
    const grid = new TableGrid(element.rows);
    const columns = new TableColumns(
      dependencies,
      element,
      styles,
      grid.colCount
    );
    const cellBuilder = new TableCellBuilder(
      dependencies,
      styles,
      new CollapsedBorders(grid, styles),
      columns
    );
    const captions = await new TableCaptions(
      dependencies,
      element,
      styles
    ).convert();

    const headerRowCount = TableConverter.countHeaderRows(element.rows);
    const rows: TableRow[] = [];
    for (const [rowIndex, rowElement] of element.rows.entries()) {
      const cells: TableCell[] = [];
      // Converted one at a time, in document order
      for (const slot of grid.getRowSlots(rowIndex)) {
        cells.push(await cellBuilder.build(slot, rowIndex));
      }
      rows.push(
        new TableRow({
          children: cells,
          ...styles.getRowOptions(rowElement),
          ...(rowIndex < headerRowCount ? { tableHeader: true } : {}),
        })
      );
    }

    if (rows.length === 0) {
      // Word can't open a table without rows, so only the captions are written,
      // as in HTML, where a table without rows still shows its caption
      return [...captions.top, ...captions.bottom];
    }

    return [
      ...captions.top,
      new Table({
        ...styles.getTableOptions(),
        // Word lays the table out by the cells' widths, but LibreOffice and
        // Google Docs by the grid. Without one, `docx` writes placeholders.
        columnWidths: columns.getGridWidths(),
        rows,
      }),
      ...captions.bottom,
    ];
  }

  /**
   * Counts the header rows that start the table: rows in a `<thead>`, or rows of
   * only `<th>` cells. Word repeats header rows at the top of every page the
   * table continues on, but only those that start the table, so the first row
   * that isn't one ends them.
   */
  private static countHeaderRows(rows: TableRowElement[]): number {
    const isHeaderRow = (row: TableRowElement) =>
      row.metadata?.section === 'thead' ||
      (row.cells.length > 0 &&
        row.cells.every((cell) => cell.metadata?.tagName === 'th'));
    const count = rows.findIndex((row) => !isHeaderRow(row));
    return count === -1 ? rows.length : count;
  }
}
