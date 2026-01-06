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

    // Split text into multiple TextRun if it contains line breaks
    // TODO: Maybe only do this for some elements such as `<pre>`
    // TODO: Maybe only do this if it has white-space: pre, pre-wrap, pre-line or preserve-breaks style
    const textParts = (element.text || '').split('\n');
    let currentRunSegment = {
      // if parts[0] is empty, it means the text starts with a line break
      trailingBreaks: Number(textParts[0] === ''),
      text: textParts[0],
    };
    const runSegments = [currentRunSegment];
    for (let i = 1; i < textParts.length; i++) {
      const segment = textParts[i]!;
      currentRunSegment.trailingBreaks += 1;
      if (segment === '') {
        continue;
      }
      currentRunSegment = {
        trailingBreaks: 0,
        text: segment,
      };
      runSegments.push(currentRunSegment);
    }

    const finalBreaks =
      typeof element.metadata?.break === 'number'
        ? element.metadata.break
        : Number(element.metadata?.break) || 0;
    currentRunSegment.trailingBreaks += finalBreaks;

    return runSegments.map(
      ({ text, trailingBreaks: breaks }) =>
        new TextRun({
          text,
          break: breaks > 0 ? breaks : undefined,
          ...styleMapper.mapStyles(mergedStyles, element),
        })
    );
  }
}
