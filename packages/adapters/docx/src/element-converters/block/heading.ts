import { FileChild, HeadingLevel, Paragraph, ParagraphChild } from 'docx';
import { DocumentElement, HeadingElement, Styles } from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';

export class HeadingConverter implements IBlockConverter<HeadingElement> {
  isMatch(element: DocumentElement): element is HeadingElement {
    return element.type === 'heading';
  }

  convertEement(
    { styleMapper, converter, defaultStyles }: ElementConverterDependencies,
    element: HeadingElement,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };
    let children: ParagraphChild[] = converter.convertInlineTextOrContent(
      element,
      mergedStyles
    );

    children = converter.runFallthroughWrapConvertedChildren(
      element,
      children,
      mergedStyles
    );

    const level =
      Number.isInteger(element.level) &&
      element.level >= 1 &&
      element.level <= 6
        ? (element.level as 1 | 2 | 3 | 4 | 5 | 6)
        : 1;
    const heading = HeadingLevel[`HEADING_${level}`];
    const mappedStyles = styleMapper.mapStyles(mergedStyles, element);

    // TODO: This may not work well in case of overlap... Check how to separate inline from block styles
    return [
      new Paragraph({
        heading,
        children,
        run: {
          ...mappedStyles,
        },
        ...mappedStyles,
      }),
    ];
  }
}
