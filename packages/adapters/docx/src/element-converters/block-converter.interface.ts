import { FileChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import { ElementConverterDependencies } from './types';

export interface IElementConverter<
  T extends DocumentElement = DocumentElement,
> {
  isMatch(element: DocumentElement): element is T;
  convertEement(
    dependencies: ElementConverterDependencies,
    element: T,
    cascadedStyles?: Styles
  ): FileChild[];
}
