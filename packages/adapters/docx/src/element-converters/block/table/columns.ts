import type {
  AttributeElement,
  DocumentElement,
  TableElement,
} from 'html-to-document-core';
import type { ElementConverterDependencies } from '../../types';
import type { TableStyles } from './styles';

/** The columns of a table, from the `<col>` elements of its `<colgroup>`. */
export class TableColumns {
  private readonly options: Record<string, unknown>[];

  public constructor(
    { styleMapper, defaultStyles, stylesheet }: ElementConverterDependencies,
    element: TableElement,
    styles: TableStyles
  ) {
    const colgroups = element.metadata?.colgroup;
    const [colgroup] = Array.isArray(colgroups)
      ? (colgroups as AttributeElement[])
      : [];
    const cols = (colgroup?.metadata as { col?: DocumentElement[] } | undefined)
      ?.col;

    this.options =
      cols?.map((col) =>
        styleMapper.mapStyles(
          {
            ...defaultStyles?.[col.type],
            ...stylesheet.getComputedStyles(col, styles.cascading),
          },
          col
        )
      ) ?? [];
  }

  /** The DOCX cell options of a column, or none for a column without a `<col>`. */
  public getOptions(col: number): Record<string, unknown> {
    return this.options[col] ?? {};
  }
}
