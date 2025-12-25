import { ParagraphChild, TextRun } from 'docx';
import {
  DocumentElement,
  filterForScope,
  Styles,
  TextElement,
} from 'html-to-document-core';
import { ElementConverterDependencies, IInlineConverter } from '../types';
import { promiseAllFlat } from '../../docx.util';

type DocumentElementType = TextElement;

export class TextConverter implements IInlineConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return true || element.type === 'text';
  }

  convertElement(
    {
      converter,
      styleMapper,
      defaultStyles,
      styleMeta,
    }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] | Promise<ParagraphChild[]> {
    const inherited = filterForScope(cascadedStyles, element.scope, styleMeta);
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...inherited,
      ...element.styles,
    };

    if (element.content && element.content.length > 0) {
      return promiseAllFlat(
        element.content.map((content) =>
          converter.convertInline(content, mergedStyles)
        )
      );
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
