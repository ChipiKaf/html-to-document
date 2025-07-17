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

    return converter.convertToBlocks({
      element,
      cascadedStyles: mergedStyles,
      wrapInlineElements: (inlines) => {
        return [
          new Paragraph({
            children: inlines,
            ...styleMapper.mapStyles(mergedStyles, element),
          }),
        ];
      },
    });
  }
}
