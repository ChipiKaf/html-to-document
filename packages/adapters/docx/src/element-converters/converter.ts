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

export class ElementConverter {
  private readonly blockConverters: IBlockConverter[];
  private readonly inlineConverters: IInlineConverter[];
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
      new ParagraphConverter(),
      new LineConverter(),
      new ListConverter(),
      new HeadingConverter(),
    ];
    this.inlineConverters = [
      ...inlineConverters,
      new LinkConverter(),
      new TextConverter(),
    ];
    this.styleMapper = styleMapper;
    this.defaultStyles = defaultStyles;

    this.elementConverterDependencies = {
      styleMapper: this.styleMapper,
      converter: this,
      defaultStyles: this.defaultStyles,
    } as const;
  }

  public convertBlock(
    element: DocumentElement,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    const converter = this.blockConverters.find((c) => c.isMatch(element));
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
}
