import { FileChild, Paragraph } from 'docx';
import {
  DocumentElement,
  ListElement,
  ListItemElement,
  Styles,
} from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';

type DocumentElementType = ListElement;

export class ListConverter implements IBlockConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'list';
  }

  convertEement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    const { defaultStyles } = dependencies;
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };
    // const children =
    //   element.content?.flatMap((child) =>
    //     converter.convertInline(child, mergedStyles)
    //   ) ?? [];

    return element.content.flatMap((element) => {
      return this.convertListItem(dependencies, element, mergedStyles);
    });
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

    const children =
      element.content?.flatMap((child) =>
        converter.convertInline(child, mergedStyles)
      ) ?? [];

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
  }
}
