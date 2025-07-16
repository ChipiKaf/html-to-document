import { FileChild, ParagraphChild } from 'docx';
import {
  DocumentElement,
  IConverterDependencies,
  StyleMapper,
  Styles,
} from 'html-to-document-core';
import { ParagraphConverter } from './block/paragraph';
import { IElementConverter } from './block-converter.interface';
import { ElementConverterDependencies } from './types';

export class ElementConverter {
  private readonly blockConverters: IElementConverter[];
  private readonly inlineConverters: never[];
  private readonly styleMapper: StyleMapper;
  private readonly defaultStyles: IConverterDependencies['defaultStyles'];

  private readonly elementConverterDependencies: ElementConverterDependencies;

  constructor({
    blockConverters = [],
    inlineConverters = [],
    styleMapper,
    defaultStyles,
  }: {
    blockConverters?: IElementConverter[];
    inlineConverters?: never[];
  } & IConverterDependencies) {
    this.blockConverters = [...blockConverters, new ParagraphConverter()];
    this.inlineConverters = inlineConverters;
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
    return [];
  }
}
