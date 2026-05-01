import { FileChild } from 'docx';
import {
  DocumentElement,
  filterForScope,
  ListElement,
  Styles,
} from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';
import { promiseAllFlat } from '../../docx.util';

type DocumentElementType = ListElement;

export class ListConverter implements IBlockConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'list';
  }

  convertElement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): FileChild[] | Promise<FileChild[]> {
    const { defaultStyles, stylesheet } = dependencies;
    const inherited = filterForScope(cascadedStyles, element.scope);
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, inherited),
    };

    return promiseAllFlat(
      element.content.map((child) => {
        child.metadata ??= {};
        child.metadata.reference = `${element.listType}${
          element.markerStyle ? `-${element.markerStyle}` : ''
        }`;
        return dependencies.converter.convertBlock(
          child,
          dependencies.stylesheet,
          mergedStyles
        );
      })
    );
  }
}
