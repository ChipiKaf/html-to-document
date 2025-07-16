import { FileChild, Paragraph } from 'docx';
import {
  DocumentElement,
  ParagraphElement,
  Styles,
} from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';

export class ParagraphConverter implements IBlockConverter<ParagraphElement> {
  isMatch(element: DocumentElement): element is ParagraphElement {
    return element.type === 'paragraph';
  }

  convertEement(
    { styleMapper, converter, defaultStyles }: ElementConverterDependencies,
    element: ParagraphElement,
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

    return [
      new Paragraph({
        children,
        ...styleMapper.mapStyles(mergedStyles, element),
      }),
    ];
  }
}
