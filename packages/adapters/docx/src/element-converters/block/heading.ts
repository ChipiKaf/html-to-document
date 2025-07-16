import { FileChild, HeadingLevel, Paragraph, TextRun } from 'docx';
import { DocumentElement, HeadingElement, Styles } from 'html-to-document-core';
import { IElementConverter } from '../block-converter.interface';
import { ElementConverterDependencies } from '../types';

export class ParagraphConverter implements IElementConverter<HeadingElement> {
  isMatch(element: DocumentElement): element is HeadingElement {
    return element.type === 'heading';
  }

  convertEement(
    { styleMapper, converter, defaultStyles }: ElementConverterDependencies,
    element: HeadingElement,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };
    const children =
      element.content?.flatMap((child) =>
        converter.convertInline(child, mergedStyles)
      ) ?? [];
    const level =
      Number.isInteger(element.level) &&
      element.level >= 1 &&
      element.level <= 6
        ? (element.level as 1 | 2 | 3 | 4 | 5 | 6)
        : 1;

    if (element.content && element.content.length > 0) {
      const children = converter.convertInline(element, mergedStyles);

      // @To-do: This may not work well in case of overlap... Check how to separate inline from block styles
      return [
        new Paragraph({
          heading: HeadingLevel[`HEADING_${level}`],
          children,
          run: {
            ...styleMapper.mapStyles(mergedStyles, element),
          },
          ...styleMapper.mapStyles(mergedStyles, element),
        }),
      ];
    }

    return [
      new Paragraph({
        heading: HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
        children: [
          new TextRun({
            text: element.text,
            color: '000000',
            ...styleMapper.mapStyles(mergedStyles, element),
          }),
        ],
        ...styleMapper.mapStyles(mergedStyles, element),
      }),
    ];
  }
}
