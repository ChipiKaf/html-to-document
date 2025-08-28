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
  FallthroughConverter,
  IBlockConverter,
  IFallthroughAttributesNestedBlockConverter,
  IFallthroughConvertedChildrenWrapperConverter,
  IInlineConverter,
} from './types';
import { LinkConverter } from './inline/link';
import { TextConverter } from './inline/text';
import { LineConverter } from './block/line';
import { ListConverter } from './block/list';
import { HeadingConverter } from './block/heading';
import { TableConverter } from './block/table';
import { IdInlineConverter } from './fallthrough/id';
import { Config } from '../docx.types';

export class ElementConverter {
  private readonly blockConverters: IBlockConverter[];
  private readonly inlineConverters: IInlineConverter[];
  private readonly fallthroughConverters: FallthroughConverter[];
  private readonly textConverter: IInlineConverter<DocumentElement>;
  private readonly styleMapper: StyleMapper;
  private readonly defaultStyles: IConverterDependencies['defaultStyles'];

  private readonly elementConverterDependencies: ElementConverterDependencies;

  constructor(
    { styleMapper, defaultStyles }: IConverterDependencies,
    config?: Config
  ) {
    const {
      blockConverters = [],
      inlineConverters = [],
      fallthroughConverters = [],
    } = config ?? {};
    this.blockConverters = [
      ...blockConverters,
      new LineConverter(),
      new ListConverter(),
      new HeadingConverter(),
      new TableConverter(),
      new ParagraphConverter(),
    ];
    this.textConverter = new TextConverter();
    const idConverter = new IdInlineConverter();
    this.fallthroughConverters = [...fallthroughConverters, idConverter];

    this.inlineConverters = [
      ...inlineConverters,
      idConverter,
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

  /**
   * Finds the first block converter that matches the given element.
   */
  private findBlockConverter(
    element: DocumentElement
  ): IBlockConverter | undefined {
    return this.blockConverters.find((converter) => converter.isMatch(element));
  }

  /**
   * Finds the first inline converter that matches the given element.
   */
  private findInlineConverter(
    element: DocumentElement
  ): IInlineConverter | undefined {
    return this.inlineConverters.find((converter) =>
      converter.isMatch(element)
    );
  }

  private findFallthroughWrapConvertedChildren(element: DocumentElement) {
    return this.fallthroughConverters.filter(
      <T extends FallthroughConverter>(
        converter: T
      ): converter is T & IFallthroughConvertedChildrenWrapperConverter =>
        converter.isMatch(element) &&
        !!converter.fallthroughWrapConvertedChildren
    );
  }

  private findFallthroughAttributesNestedBlock(element: DocumentElement) {
    return this.fallthroughConverters.filter(
      <T extends FallthroughConverter>(
        converter: T
      ): converter is T & IFallthroughAttributesNestedBlockConverter =>
        converter.isMatch(element) &&
        !!converter.fallthroughAttributesNestedBlock
    );
  }

  /**
   * Converts a block element by finding a matching converter and running it's convert method.
   */
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

  /**
   * Converts an inline element by finding a matching converter and running it's convert method.
   */
  public convertInline(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    const converter = this.findInlineConverter(element);
    if (!converter) {
      return [];
    }

    return converter.convertEement(
      this.elementConverterDependencies,
      element,
      cascadedStyles
    );
  }

  /**
   * Uses the text converter to convert the given element
   */
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

  /**
   * Finds all fallthrough converters that match the given element and runs their `fallthroughWrapConvertedChildren` method.
   * This can be used to wrap converted children with additional elements or styles. Such as wrapping inline elements in a `Bookmark`.
   */
  public runFallthroughWrapConvertedChildren(
    element: DocumentElement,
    inlineChildren: ParagraphChild[],
    cascadedStyles?: Styles,
    index: number = 0
  ): ParagraphChild[] {
    const fallthroughConverters =
      this.findFallthroughWrapConvertedChildren(element);

    return fallthroughConverters.reduce((acc, converter) => {
      return converter.fallthroughWrapConvertedChildren(
        this.elementConverterDependencies,
        element,
        acc,
        cascadedStyles,
        index
      );
    }, inlineChildren);
  }

  /**
   * Runs all fallthrough converters that match the given element and have a `fallthroughAttributesNestedBlock` method.
   * This is used to apply additional attributes or styles to nested blocks within the element.
   * For example, this can be used to apply styles or attributes to nested blocks that are not directly supported by the block converter.
   */
  public runFallthroughNestedBlock(
    dependencies: ElementConverterDependencies,
    element: DocumentElement,
    childBlock: DocumentElement,
    cascadedStyles?: Styles
  ): DocumentElement {
    // const fallthroughConverters = this.fallthroughConverters.filter(
    //   (c) =>
    //     c.isMatch(element) && c.fallthroughAttributesNestedBlock
    // );
    const fallthroughConverters =
      this.findFallthroughAttributesNestedBlock(element);

    return fallthroughConverters.reduce((newChildBlock, converter) => {
      return converter.fallthroughAttributesNestedBlock(
        dependencies,
        element,
        newChildBlock,
        cascadedStyles
      );
    }, childBlock);
  }

  /**
   * If an element only can have inline children, you can use this method.
   * It will convert nested blocks to inline elements as well.
   */
  public convertInlineTextOrContent(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    let children: ParagraphChild[] = [];

    if (element.content && element.content.length > 0) {
      children = element.content.flatMap((child) =>
        this.convertInline(child, cascadedStyles)
      );
    } else {
      children = this.convertText(element, cascadedStyles);
    }

    // children = this.runFallthroughWrapConvertedChildren(
    //   element,
    //   children,
    //   cascadedStyles,
    //   0
    // );

    return children;
  }

  /**
   * Some elements might have nested bloks.
   * You can use this method to convert the element to blocks and wrapping all inline element "chunks" in a block as well.
   */
  public convertToBlocks(options: {
    element: DocumentElement;
    cascadedStyles?: Styles;
    /**
     * Whether nested paragraphs should be inline with newlines around it
     * @default false
     */
    inlineParagraphs?: boolean;
    /** Handler for when encountering a block element within the content. */
    convertBlock?: (
      dependencies: ElementConverterDependencies,
      element: DocumentElement,
      index: number,
      cascadedStyles?: Styles
    ) => FileChild[];
    /** Handler for wrapping inline elements "chunks" in a block element. */
    wrapInlineElements: (
      elements: ParagraphChild[],
      index: number
    ) => FileChild[];
  }): FileChild[] {
    const {
      element,
      cascadedStyles = {},
      wrapInlineElements,
      inlineParagraphs = false,
      convertBlock = (dependencies, element, index, cascadedStyles) =>
        this.convertBlock(element, cascadedStyles),
    } = options;

    if (!element.content || element.content.length <= 0) {
      // If the provided element has no content it probably has text and we can convert it inline or directly with the text converter?
      const inlineElements = this.convertInline(element, cascadedStyles);
      // const wrappedChildren = this.runFallthroughWrapConvertedChildren(
      //   element,
      //   inlineElements,
      //   cascadedStyles,
      //   0
      // );
      return wrapInlineElements(inlineElements, 0);
    }

    let content: DocumentElement[] = element.content;
    if (inlineParagraphs) {
      const contentLength = content.length;
      content = content.map((child, i): DocumentElement => {
        const isFirst = i === 0;
        const isLast = i === contentLength - 1;
        const isPrevParagraph = content[i - 1]?.type === 'paragraph';
        if (child.type !== 'paragraph') {
          return child;
        }

        const hasTextOrContent =
          child.text || (child.content && child.content.length > 0);
        const hasNewlineBefore =
          hasTextOrContent && !isFirst && !isPrevParagraph;
        const hasNewlineAfter = !isLast;

        const br = {
          type: 'text',
          text: '',
          metadata: {
            tagName: 'br',
            break: 1,
          },
        };

        return {
          type: 'text',
          content: [
            ...(hasNewlineBefore ? [br] : []),
            ...(child.content ??
              (child.text ? [{ type: 'text', text: child.text }] : [])),
            ...(hasNewlineAfter ? [br] : []),
          ],
        };
      });
    }

    const marked = content.map((child) => {
      const blockConverter = this.findBlockConverter(child);

      if (blockConverter) {
        return {
          type: 'blocks',
          children: child,
        } as const;
      }

      return {
        type: 'inline' as const,
        // inlineElements,
        children: [child],
      };
    });

    const markedWithMergedInlines = marked.reduce(
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
        previousItem.children.push(...item.children);

        return acc;
      },
      [] as typeof marked
    );

    const wrapped = markedWithMergedInlines.flatMap((item, i) => {
      if (item.type === 'blocks') {
        return convertBlock(
          this.elementConverterDependencies,
          item.children,
          i,
          cascadedStyles
        );
      }

      let newChildren = item.children.flatMap((child) =>
        this.convertInline(child, cascadedStyles)
      );

      // const wrappedChildren = this.runFallthroughWrapConvertedChildren(
      //   element,
      //   newChildren,
      //   cascadedStyles,
      //   i
      // );
      //
      // return wrapInlineElements(wrappedChildren, i);

      return wrapInlineElements(newChildren, i);
    });

    return wrapped;
  }
}
