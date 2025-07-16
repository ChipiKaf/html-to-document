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

export class ElementConverter {
  private readonly blockConverters: IBlockConverter[];
  private readonly inlineConverters: IInlineConverter[];
  private readonly fallthroughConverters: FallthroughConverter[];
  private readonly textConverter: IInlineConverter<DocumentElement>;
  private readonly styleMapper: StyleMapper;
  private readonly defaultStyles: IConverterDependencies['defaultStyles'];

  private readonly elementConverterDependencies: ElementConverterDependencies;

  constructor({
    blockConverters = [],
    fallthroughConverters = [],
    inlineConverters = [],
    styleMapper,
    defaultStyles,
  }: {
    blockConverters?: IBlockConverter[];
    fallthroughConverters?: FallthroughConverter[];
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

  private findBlockConverter(
    element: DocumentElement
  ): IBlockConverter | undefined {
    return this.blockConverters.find((converter) => converter.isMatch(element));
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
   */
  public convertToBlocks(options: {
    element: DocumentElement;
    cascadedStyles?: Styles;
    convertBlock?: (
      dependencies: ElementConverterDependencies,
      element: DocumentElement,
      index: number,
      cascadedStyles?: Styles
    ) => FileChild[];
    wrapInlineElements: (
      elements: ParagraphChild[],
      index: number
    ) => FileChild[];
  }): FileChild[] {
    const {
      element,
      cascadedStyles = {},
      wrapInlineElements,
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

    const marked = element.content.map((child) => {
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
