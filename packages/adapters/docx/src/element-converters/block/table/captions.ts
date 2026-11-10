import { Paragraph } from 'docx';
import {
  type AttributeElement,
  cascadeStyles,
  type TableElement,
} from 'html-to-document-core';
import type { ElementConverterDependencies } from '../../types';
import type { TableStyles } from './styles';

/** The `<caption>` elements of a table, written as paragraphs above or below it. */
export class TableCaptions {
  public constructor(
    private readonly dependencies: ElementConverterDependencies,
    private readonly element: TableElement,
    private readonly styles: TableStyles
  ) {}

  /** Converts the captions, grouped by the side of the table they go on. */
  public async convert(): Promise<{ top: Paragraph[]; bottom: Paragraph[] }> {
    const captions = Array.isArray(this.element.metadata?.caption)
      ? (this.element.metadata.caption as AttributeElement[])
      : [];
    const converted = await Promise.all(
      captions.map(async (caption) => ({
        side: caption.styles?.captionSide || 'top',
        paragraph: await this.convertCaption(caption),
      }))
    );

    return {
      top: converted.filter((c) => c.side === 'top').map((c) => c.paragraph),
      bottom: converted
        .filter((c) => c.side === 'bottom')
        .map((c) => c.paragraph),
    };
  }

  private async convertCaption(caption: AttributeElement): Promise<Paragraph> {
    const { styleMapper, converter, defaultStyles, stylesheet, styleMeta } =
      this.dependencies;
    const mergedStyles = {
      ...defaultStyles?.[caption.type],
      ...stylesheet.getComputedStyles(caption, this.styles.cascading),
    };
    const innerCascadingStyles = cascadeStyles(
      mergedStyles,
      caption.scope,
      styleMeta
    );
    return new Paragraph({
      children: await converter.convertInline(
        caption,
        stylesheet,
        innerCascadingStyles
      ),
      ...styleMapper.mapStyles(mergedStyles, caption),
    });
  }
}
