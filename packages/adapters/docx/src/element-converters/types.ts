import { IConverterDependencies, IStylesheet } from 'html-to-document-core';
import { ElementConverter } from './converter';
import { FileChild, ParagraphChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import { Object } from 'ts-toolbelt';
import { DocxStyleMapper } from '../docx-style-mapper';

export type ElementStylesheet = {
  getStatements: IStylesheet['getStatements'];
  getComputedStylesBySelector: IStylesheet['getComputedStylesBySelector'];
  /**
   * Returns only the styles resolved from stylesheet rules that match the element.
   * Does not merge in the element's own inline/document styles.
   */
  getMatchedStyles: IStylesheet['getMatchedStyles'];
  /**
   * Returns the final merged styles for the element.
   * Starts with stylesheet-resolved styles, then applies the element's own styles.
   */
  getComputedStyles: IStylesheet['getComputedStyles'];
};

export type ElementConverterDependencies = {
  styleMapper: DocxStyleMapper;
  converter: ElementConverter;
  defaultStyles: IConverterDependencies['defaultStyles'];
  stylesheet: ElementStylesheet;
  styleMeta: IConverterDependencies['styleMeta'];
};

interface IIsMatch<T extends DocumentElement> {
  isMatch(element: DocumentElement): element is T;
}

export interface IElementConverter<
  T extends DocumentElement,
  Output extends FileChild[] | ParagraphChild[],
> extends IIsMatch<T> {
  convertElement(
    dependencies: ElementConverterDependencies,
    element: T,
    cascadedStyles?: Styles
  ): Output | Promise<Output>;
}

export interface IBlockConverter<T extends DocumentElement = DocumentElement>
  extends IElementConverter<T, FileChild[]> {
  /**
   * @beta This field is still experimental and may change to another type in the future
   */
  readonly preferInlineConversion?: boolean;
}
export interface IInlineConverter<T extends DocumentElement = DocumentElement>
  extends IElementConverter<T, ParagraphChild[]> {}

// export type FallthroughFunction = (
//   children: ParagraphChild[],
//   i?: number
// ) => ParagraphChild[];

export interface IFallthroughConvertedChildrenWrapperConverter<
  T extends DocumentElement = DocumentElement,
> extends IIsMatch<T> {
  fallthroughWrapConvertedChildren(
    dependencies: ElementConverterDependencies,
    element: T,
    inlineChildren: ParagraphChild[],
    cascadedStyles?: Styles,
    index?: number
  ): ParagraphChild[];
}

export interface IFallthroughAttributesNestedBlockConverter<
  T extends DocumentElement = DocumentElement,
> extends IIsMatch<T> {
  fallthroughAttributesNestedBlock(
    dependencies: ElementConverterDependencies,
    element: T,
    childBlock: DocumentElement,
    cascadedStyles?: Styles
  ): DocumentElement;
}

// If more fallthrough converters are added, we can extends this type to be a union of those
type FallthroughConverters = [
  IFallthroughConvertedChildrenWrapperConverter,
  IFallthroughAttributesNestedBlockConverter,
];
export type FallthroughConverter = FallthroughConverters[number] &
  Partial<Object.MergeAll<{}, FallthroughConverters>>;
