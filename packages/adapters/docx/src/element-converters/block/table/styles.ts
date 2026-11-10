import { BorderStyle } from 'docx';
import {
  cascadeStyles,
  type DocumentElement,
  type Styles,
  type TableElement,
  type TableRowElement,
} from 'html-to-document-core';
import { lengthOrPercentageToTwips } from '../../../utils/parse';
import type { ElementConverterDependencies } from '../../types';
import type { PlacedCell } from './grid';

export const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };

/**
 * Resolves the CSS styles of a table, its rows and its cells, and maps them to
 * DOCX options. A cell's styles are resolved and mapped once, however many rows
 * it spans.
 */
export class TableStyles {
  /** The table's own CSS styles, including those cascaded from its parent. */
  public readonly table: Styles;
  /** The styles the table passes on to its captions and columns. */
  public readonly cascading: Styles;
  private readonly cellStyles = new Map<PlacedCell, Styles>();
  private readonly cellOptions = new Map<PlacedCell, Record<string, unknown>>();

  public constructor(
    private readonly dependencies: ElementConverterDependencies,
    private readonly element: TableElement,
    cascadedStyles?: Styles
  ) {
    const { defaultStyles, stylesheet, styleMeta } = dependencies;
    this.table = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, cascadedStyles),
    };
    this.cascading = cascadeStyles(this.table, element.scope, styleMeta);
  }

  /** The table's DOCX options. */
  public getTableOptions(): Record<string, unknown> {
    const options = this.dependencies.styleMapper.mapStyles(
      this.table,
      this.element
    );

    // HTML default: tables have no visible borders unless explicitly styled.
    // The docx library falls back to DEFAULT_BORDER (single, size 4) for every
    // unspecified side in TableBorders — including insideH/V — so we must
    // always supply an explicit all-none set and let CSS values override it.
    return {
      ...options,
      borders: {
        top: NONE_BORDER,
        bottom: NONE_BORDER,
        left: NONE_BORDER,
        right: NONE_BORDER,
        insideHorizontal: NONE_BORDER,
        insideVertical: NONE_BORDER,
        ...((options.borders as Record<string, unknown> | undefined) ?? {}),
      },
    };
  }

  /**
   * The table's width in twips, which the widths of its columns resolve their
   * percentages against. A percentage resolves against the width of its
   * container's content, as does a table without a width, which can at most be
   * as wide as that.
   */
  public getTableWidth(): number {
    const { containerContentWidth } = this.dependencies;
    return (
      lengthOrPercentageToTwips(
        this.table.width as string | number | undefined,
        containerContentWidth
      ) ?? containerContentWidth
    );
  }

  /** A row's DOCX options. */
  public getRowOptions(row: TableRowElement): Record<string, unknown> {
    return this.dependencies.styleMapper.mapStyles(
      this.resolveOwnStyles(row),
      row
    );
  }

  /** A cell's CSS styles. */
  public getCellStyles(placed: PlacedCell): Styles {
    if (!this.cellStyles.has(placed)) {
      this.cellStyles.set(placed, this.resolveOwnStyles(placed.cell));
    }
    return this.cellStyles.get(placed)!;
  }

  /** A cell's DOCX options, mapped from its CSS styles. */
  public getCellOptions(placed: PlacedCell): Record<string, unknown> {
    if (!this.cellOptions.has(placed)) {
      this.cellOptions.set(
        placed,
        this.dependencies.styleMapper.mapStyles(
          this.getCellStyles(placed),
          placed.cell
        )
      );
    }
    return this.cellOptions.get(placed)!;
  }

  /**
   * Resolves an element's own CSS styles, in order of precedence: the adapter's
   * default styles for the element type, then the style sheet rules that match it,
   * then its inline styles.
   */
  private resolveOwnStyles(element: DocumentElement): Styles {
    const { defaultStyles, stylesheet } = this.dependencies;
    return {
      ...defaultStyles?.[element.type],
      ...stylesheet.getMatchedStyles(element),
      ...element.styles,
    };
  }
}
