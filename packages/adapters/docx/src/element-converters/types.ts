import { IConverterDependencies, StyleMapper } from 'html-to-document-core';
import { ElementConverter } from './converter';
import { FileChild, ParagraphChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';

export type ElementConverterDependencies = {
  styleMapper: StyleMapper;
  converter: ElementConverter;
  defaultStyles: IConverterDependencies['defaultStyles'];
};

export interface IElementConverter<
  T extends DocumentElement,
  Output extends FileChild[] | ParagraphChild[],
> {
  isMatch(element: DocumentElement): element is T;
  convertEement(
    dependencies: ElementConverterDependencies,
    element: T,
    cascadedStyles?: Styles
  ): Output;
}

export interface IBlockConverter<T extends DocumentElement = DocumentElement>
  extends IElementConverter<T, FileChild[]> {}
export interface IInlineConverter<T extends DocumentElement = DocumentElement>
  extends IElementConverter<T, ParagraphChild[]> {}
