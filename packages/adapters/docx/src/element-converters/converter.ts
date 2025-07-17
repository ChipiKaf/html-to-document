import { FileChild, ParagraphChild } from 'docx';
import {
  DocumentElement,
  IConverterDependencies,
  StyleMapper,
  Styles,
} from 'html-to-document-core';
import { ParagraphConverter } from './block/paragraph';
import {
  ElementConverterDependencies,
  IBlockConverter,
  IInlineConverter,
} from './types';
import { LinkConverter } from './inline/link';
import { TextConverter } from './inline/text';
import { LineConverter } from './block/line';
import { ListConverter } from './block/list';
import { HeadingConverter } from './block/heading';
import { TableConverter } from './block/table';
import { IdInlineConverter } from './fallthrough/id';

export class ElementConverter {
  private readonly blockConverters: IBlockConverter[];
  private readonly inlineConverters: IInlineConverter[];
  private readonly textConverter: IInlineConverter<DocumentElement>;
  private readonly styleMapper: StyleMapper;
  private readonly defaultStyles: IConverterDependencies['defaultStyles'];

  private readonly elementConverterDependencies: ElementConverterDependencies;

  constructor({
    blockConverters = [],
    inlineConverters = [],
    styleMapper,
    defaultStyles,
  }: {
    blockConverters?: IBlockConverter[];
    inlineConverters?: IInlineConverter[];
  } & IConverterDependencies) {
    this.blockConverters = [
      ...blockConverters,
      new LineConverter(),
      new ListConverter(),
      new HeadingConverter(),
      new TableConverter(),
      new ParagraphConverter(),
    ];
    this.textConverter = new TextConverter();
    this.inlineConverters = [
      ...inlineConverters,
      new IdInlineConverter(),
      new LinkConverter(),
      this.textConverter,
    ];
    this.styleMapper = styleMapper;
    this.defaultStyles = defaultStyles;

    this.elementConverterDependencies = {
      styleMapper: this.styleMapper,
      converter: this,
      defaultStyles: this.defaultStyles,
    } as const;
  }

  private findBlockConverter(
    element: DocumentElement
  ): IBlockConverter | undefined {
    return this.blockConverters.find((converter) => converter.isMatch(element));
  }

  public convertBlock(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    const converter = this.findBlockConverter(element);
    if (!converter) {
      return [];
    }

    return converter.convertEement(
      this.elementConverterDependencies,
      element,
      cascadedStyles
    );
  }

  public convertInline(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    const converter = this.inlineConverters.find((c) => c.isMatch(element));
    if (!converter) {
      return [];
    }

    return converter.convertEement(
      this.elementConverterDependencies,
      element,
      cascadedStyles
    );
  }

  public convertText(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    return this.textConverter.convertEement(
      this.elementConverterDependencies,
      element,
      cascadedStyles
    );
  }

  public convertInlineTextOrContent(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    if (element.content && element.content.length > 0) {
      return element.content.flatMap((child) =>
        this.convertInline(child, cascadedStyles)
      );
    }

    return this.convertText(element, cascadedStyles);
  }

  /**
   */
  public convertToBlocks(options: {
    element: DocumentElement;
    cascadedStyles?: Styles;
    wrapInlineElements: (elements: ParagraphChild[]) => FileChild[];
  }): FileChild[] {
    const { element, cascadedStyles = {}, wrapInlineElements } = options;

    if (!element.content || element.content.length <= 0) {
      // If the provided element has no content it probably has text and we can convert it inline or directly with the text converter?
      const inlineElements = this.convertInline(element, cascadedStyles);
      return wrapInlineElements(inlineElements);
    }

    const partitioned = element.content.map((child) => {
      const blockConverter = this.findBlockConverter(child);

      if (blockConverter) {
        const blocks = this.convertBlock(child, cascadedStyles);
        return {
          type: 'blocks',
          blocks,
        } as const;
      }

      const inlineElements = this.convertInline(child, cascadedStyles);

      return {
        type: 'inline',
        inlineElements,
      } as const;
    });

    const partitionedWithMergedInlines = partitioned.reduce(
      (acc, item) => {
        if (item.type === 'blocks') {
          acc.push(item);
          return acc;
        }

        const previousItem = acc[acc.length - 1];

        if (!previousItem || previousItem.type === 'blocks') {
          acc.push(item);
          return acc;
        }

        // At this point both are inline and we can merge them
        previousItem.inlineElements.push(...item.inlineElements);

        return acc;
      },
      [] as typeof partitioned
    );

    const wrapped = partitionedWithMergedInlines.flatMap((item) => {
      if (item.type === 'blocks') {
        return item.blocks;
      }

      return wrapInlineElements(item.inlineElements);
    });

    return wrapped;
  }
}
