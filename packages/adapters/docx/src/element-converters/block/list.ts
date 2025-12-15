import { FileChild, Paragraph } from 'docx';
import {
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

  convertEement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): FileChild[] | Promise<FileChild[]> {
    const { defaultStyles } = dependencies;
    const inherited = filterForScope(cascadedStyles, element.scope);
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...inherited,
      ...element.styles,
    };
    // const children =
    //   element.content?.flatMap((child) =>
    //     converter.convertInline(child, mergedStyles)
    //   ) ?? [];

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
    { styleMapper, converter, defaultStyles }: ElementConverterDependencies,
    element: ListItemElement,
    cascadedStyles: Styles = {}
  ) {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };

    return converter.convertToBlocks({
      cascadedStyles: mergedStyles,
      inlineParagraphs: true,
      element,
      wrapInlineElements: (inlines, i) => {
        const children = converter.runFallthroughWrapConvertedChildren(
          element,
          inlines,
          mergedStyles,
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
