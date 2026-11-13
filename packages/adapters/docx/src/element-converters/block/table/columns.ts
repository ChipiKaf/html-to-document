import type {
  AttributeElement,
  DocumentElement,
  TableElement,
} from 'html-to-document-core';
import { type ITableWidthProperties, WidthType } from 'docx';
import { omit } from 'remeda';
import { lengthToTwips, percentageWidth } from '../../../utils/parse';
import type { ElementConverterDependencies } from '../../types';
import type { TableStyles } from './styles';

/** A column's width, as a percentage of the table's width or in twips. */
type ColumnWidth = { percent: number } | { twips: number };

/**
 * The columns of a table, from the `<col>` elements of its `<colgroup>`. Their
 * widths make the table's grid and the widths of the cells in them, and their
 * other styles apply to their cells. As in CSS's fixed table layout, the
 * columns without a width split the rest of the table's width evenly.
 */
export class TableColumns {
  /** The DOCX options of each column's cells, other than their width. */
  private readonly cellOptions: Record<string, unknown>[];
  /** The width of each column of the grid, or `undefined` for one without. */
  private readonly widths: (ColumnWidth | undefined)[];
  private readonly tableWidth: number;

  public constructor(
    { styleMapper, defaultStyles, stylesheet }: ElementConverterDependencies,
    element: TableElement,
    styles: TableStyles,
    colCount: number
  ) {
    const colgroups = element.metadata?.colgroup;
    const [colgroup] = Array.isArray(colgroups)
      ? (colgroups as AttributeElement[])
      : [];
    const colElements =
      (colgroup?.metadata as { col?: DocumentElement[] } | undefined)?.col ??
      [];
    // A <col> with a span stands for that many columns
    const cols = colElements.flatMap((col) =>
      Array.from(
        { length: TableColumns.parseSpan(col.attributes?.span) },
        () => col
      )
    );
    const colStyles = cols.map((col) => ({
      ...defaultStyles?.[col.type],
      ...stylesheet.getComputedStyles(col, styles.cascading),
    }));

    this.tableWidth = styles.getTableWidth();
    // A cell's width is the widths of every column it spans
    this.cellOptions = cols.map((col, i) =>
      omit(styleMapper.mapStyles(colStyles[i]!, col), ['width'])
    );
    this.widths = this.shareRest(
      Array.from({ length: colCount }, (_, col) =>
        TableColumns.parseWidth(colStyles[col]?.width)
      )
    );
  }

  /**
   * The DOCX options of a cell in the columns it spans: its width from all of
   * them, and its other options from the first, or none for a column without a
   * `<col>`.
   */
  public getCellOptions(col: number, colSpan = 1): Record<string, unknown> {
    const options = this.cellOptions[col] ?? {};
    const width = this.getSpanWidth(col, colSpan);
    return width ? { ...options, width } : options;
  }

  /**
   * The widths of the table's grid in twips, or `undefined` unless every column
   * has a width.
   */
  public getGridWidths(): number[] | undefined {
    const widths = this.widths;
    return TableColumns.hasWidths(widths)
      ? widths.map((width) => this.toTwips(width))
      : undefined;
  }

  /**
   * The widths of the columns a cell spans in twips, added together, or
   * `undefined` when one has no width.
   */
  public getSpanTwips(col: number, colSpan: number): number | undefined {
    const widths = this.widths.slice(col, col + colSpan);
    return TableColumns.hasWidths(widths)
      ? widths.reduce((sum, width) => sum + this.toTwips(width), 0)
      : undefined;
  }

  /**
   * The widths of the columns a cell spans, added together, or `undefined` when
   * one has no width. Percentages stay a percentage of the table, so the cell
   * resizes with the table in Word, and the table with the page. A percentage and
   * an absolute width add up in twips.
   */
  private getSpanWidth(
    col: number,
    colSpan: number
  ): ITableWidthProperties | undefined {
    const widths = this.widths.slice(col, col + colSpan);
    if (!TableColumns.hasWidths(widths)) return undefined;
    if (widths.every((width) => 'percent' in width)) {
      return percentageWidth(
        widths.reduce((sum, width) => sum + width.percent, 0)
      );
    }
    return {
      size: widths.reduce((sum, width) => sum + this.toTwips(width), 0),
      type: WidthType.DXA,
    };
  }

  /**
   * Splits the rest of the table's width evenly among the columns without a
   * width: as a percentage of the table when the other columns are all
   * percentages, so their cells resize with the table too, otherwise in twips.
   * Leaves them without a width when no column has one, or the others leave
   * none for them.
   */
  private shareRest(
    widths: (ColumnWidth | undefined)[]
  ): (ColumnWidth | undefined)[] {
    const known = widths.filter((width) => width !== undefined);
    const missing = widths.length - known.length;
    if (missing === 0 || known.length === 0) return widths;

    let share: ColumnWidth;
    if (known.every((width) => 'percent' in width)) {
      const rest = 100 - known.reduce((sum, width) => sum + width.percent, 0);
      if (rest <= 0) return widths;
      share = { percent: rest / missing };
    } else {
      const rest =
        this.tableWidth -
        known.reduce((sum, width) => sum + this.toTwips(width), 0);
      if (rest <= 0) return widths;
      share = { twips: Math.round(rest / missing) };
    }
    return widths.map((width) => width ?? share);
  }

  private toTwips(width: ColumnWidth): number {
    return 'percent' in width
      ? Math.round((this.tableWidth * width.percent) / 100)
      : width.twips;
  }

  private static parseWidth(value: unknown): ColumnWidth | undefined {
    if (typeof value === 'string' && value.trim().endsWith('%')) {
      const percent = parseFloat(value);
      return Number.isFinite(percent) ? { percent } : undefined;
    }
    const twips = lengthToTwips(value as string | number | undefined);
    return twips === undefined ? undefined : { twips };
  }

  private static parseSpan(value: unknown): number {
    const span = Math.floor(Number(value));
    return Number.isFinite(span) && span > 0 ? span : 1;
  }

  private static hasWidths(
    widths: (ColumnWidth | undefined)[]
  ): widths is ColumnWidth[] {
    return widths.every((width) => width !== undefined);
  }
}
