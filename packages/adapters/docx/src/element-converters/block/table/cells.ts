import { createBaseParagraphElement } from '../../../docx-stylesheet';
import {
  type FileChild,
  Paragraph,
  TableCell,
  TextRun,
  VerticalAlign,
} from 'docx';
import { computeInheritedStyles, filterForScope } from 'html-to-document-core';
import type { ElementConverterDependencies } from '../../types';
import type { CollapsedBorders } from './borders';
import type { TableColumns } from './columns';
import type { PlacedCell, RowSlot } from './grid';
import { NONE_BORDER, type TableStyles } from './styles';

/**
 * Builds the `TableCell` for each slot of a row: the content of a cell in its
 * first row, an empty continuation in the later rows of a cell spanning rows,
 * or an empty cell for a slot no cell covers.
 */
export class TableCellBuilder {
  public constructor(
    private readonly dependencies: ElementConverterDependencies,
    private readonly styles: TableStyles,
    private readonly borders: CollapsedBorders,
    private readonly columns: TableColumns
  ) {}

  public async build(slot: RowSlot, row: number): Promise<TableCell> {
    const columnOptions = this.columns.getOptions(slot.col);
    if (slot.kind === 'empty') {
      return new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        ...columnOptions,
        children: [TableCellBuilder.createEmptyParagraph()],
      });
    }

    const { placed } = slot;
    const cellOptions = this.styles.getCellOptions(placed);
    const borders = {
      ...(columnOptions.borders as Record<string, unknown> | undefined),
      ...(cellOptions.borders as Record<string, unknown> | undefined),
      ...Object.fromEntries(
        this.borders
          .getSuppressedSides(placed, row)
          .map((side) => [side, NONE_BORDER])
      ),
    };

    return new TableCell({
      columnSpan: placed.colSpan > 1 ? placed.colSpan : undefined,
      verticalMerge:
        slot.kind === 'continuation'
          ? 'continue'
          : placed.rowSpan > 1
            ? 'restart'
            : undefined,
      verticalAlign: VerticalAlign.CENTER,
      ...columnOptions,
      ...cellOptions,
      ...(Object.keys(borders).length > 0 ? { borders } : {}),
      children:
        slot.kind === 'start'
          ? await this.convertContent(placed)
          : [TableCellBuilder.createEmptyParagraph()],
    });
  }

  /** Converts a cell's content, which it writes in the first row it covers. */
  private async convertContent(placed: PlacedCell): Promise<FileChild[]> {
    const { converter, stylesheet, styleMapper, styleMeta } = this.dependencies;
    const cascadedCellStyles = computeInheritedStyles({
      parentStyles: this.styles.getCellStyles(placed),
      parentScope: 'tableCell',
      childScope: 'block',
      metaRegistry: styleMeta,
    });

    return converter.convertToBlocks({
      element: placed.cell,
      stylesheet,
      cascadedStyles: cascadedCellStyles,
      wrapInlineElements: (inlines) => [
        new Paragraph({
          children: inlines,
          ...styleMapper.mapStyles(
            filterForScope(cascadedCellStyles, 'block', styleMeta),
            createBaseParagraphElement()
          ),
        }),
      ],
    });
  }

  private static createEmptyParagraph(): Paragraph {
    return new Paragraph({ children: [new TextRun({ text: '' })] });
  }
}
