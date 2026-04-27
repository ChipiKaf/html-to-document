import { FileChild, Paragraph } from 'docx';
import {
  cascadeStyles,
  DocumentElement,
  filterForScope,
  ListElement,
  ListItemElement,
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
        return this.convertListItem(dependencies, child, mergedStyles);
      })
    );
  }

  convertListItem(
    {
      styleMapper,
      converter,
      defaultStyles,
      stylesheet,
      styleMeta,
    }: ElementConverterDependencies,
    element: ListItemElement,
    cascadedStyles: Styles = {}
  ) {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, cascadedStyles),
    };

    return converter.convertToBlocks({
      stylesheet,
      cascadedStyles: mergedStyles,
      inlineParagraphs: true,
      element,
      wrapInlineElements: (inlines, i) => {
        const cascadingStyles = cascadeStyles(
          mergedStyles,
          element.scope,
          styleMeta
        );
        const children = converter.runFallthroughWrapConvertedChildren(
          element,
          stylesheet,
          inlines,
          cascadingStyles,
          i
        );
        return [
          new Paragraph({
            numbering: {
              reference: (element.metadata?.reference as string) || '',
              level: element.level,
            },
            run: {
              ...styleMapper.mapStyles(mergedStyles, element),
            },
            children,
          }),
        ];
      },
    });
  }
}
