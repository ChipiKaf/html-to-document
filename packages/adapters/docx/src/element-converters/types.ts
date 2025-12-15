import { IConverterDependencies, StyleMapper } from 'html-to-document-core';
import { ElementConverter } from './converter';
import { FileChild, ParagraphChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import { Object } from 'ts-toolbelt';

export type ElementConverterDependencies = {
  styleMapper: StyleMapper;
  converter: ElementConverter;
  defaultStyles: IConverterDependencies['defaultStyles'];
  styleMeta: IConverterDependencies['styleMeta'];
};

interface IIsMatch<T extends DocumentElement> {
  isMatch(element: DocumentElement): element is T;
}

export interface IElementConverter<
  T extends DocumentElement,
  Output extends FileChild[] | ParagraphChild[],
> extends IIsMatch<T> {
  convertEement(
    dependencies: ElementConverterDependencies,
    element: T,
    cascadedStyles?: Styles
  ): Output | Promise<Output>;
}

export interface IBlockConverter<T extends DocumentElement = DocumentElement>
  extends IElementConverter<T, FileChild[]> {
  // convertEement(
  //   dependencies: ElementConverterDependencies,
  //   element: T,
  //   cascadedStyles?: Styles
  // ): FileChild[];
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
