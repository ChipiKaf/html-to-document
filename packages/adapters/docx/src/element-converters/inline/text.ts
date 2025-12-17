import { ParagraphChild, TextRun } from 'docx';
import {
  DocumentElement,
  filterForScope,
  Styles,
  TextElement,
  splitTextElementByLineBreaks,
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

    // TODO: Parser should split text elements by line breaks if they are `<pre>` elements or it has `white-space: pre` style or one of the other pre-styles.
    const lineElements = splitTextElementByLineBreaks(element);
    return lineElements.map((lineElement) => {
      const breaks =
        typeof lineElement.metadata?.break === 'number'
          ? lineElement.metadata.break
          : Number(lineElement.metadata?.break) || 0;
      return new TextRun({
        text: lineElement.text,
        break: breaks > 0 ? breaks : undefined,
        ...styleMapper.mapStyles(mergedStyles, element),
      });
    });
  }
}
