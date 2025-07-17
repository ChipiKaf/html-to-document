import { ParagraphChild, TextRun } from 'docx';
import { DocumentElement, Styles, TextElement } from 'html-to-document-core';
import { ElementConverterDependencies, IInlineConverter } from '../types';

type DocumentElementType = TextElement;

export class TextConverter implements IInlineConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return true || element.type === 'text';
  }

  convertEement(
    { converter, styleMapper, defaultStyles }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };

    if (element.content && element.content.length > 0) {
      return element.content.flatMap((content) => {
        return converter.convertInline(content, mergedStyles);
      });
    }

    return [
      new TextRun({
        text: element.text ?? '',
        break: (element.metadata?.break as number) || undefined,
        ...styleMapper.mapStyles(mergedStyles, element),
      }),
    ];
  }
}
