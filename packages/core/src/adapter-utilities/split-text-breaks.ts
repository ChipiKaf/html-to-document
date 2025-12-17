import { TextElement } from '../types';

export const splitTextElementByLineBreaks = (
  element: TextElement
): TextElement[] => {
  const textParts = (element.text || '').split('\n');

  let currentSegment = {
    // if parts[0] is empty, it means the text starts with a line break, if there are more than 1 part. If there is only one part it means that the initial text is empty
    trailingBreaks: 0,
    text: textParts[0] ?? '',
  };
  const segments = [currentSegment];

  for (let i = 1; i < textParts.length; i++) {
    const textSegment = textParts[i]!;
    currentSegment.trailingBreaks += 1;
    if (textSegment === '') {
      continue;
    }
    currentSegment = {
      trailingBreaks: 0,
      text: textSegment,
    };
    segments.push(currentSegment);
  }

  const lastSegment = currentSegment;
  const finalBreaks =
    typeof element.metadata?.break === 'number'
      ? element.metadata.break
      : Number(element.metadata?.break) || 0;
  lastSegment.trailingBreaks += finalBreaks;

  return segments.map((segment) => ({
    ...element,
    text: segment.text,
    metadata:
      element.metadata || segment.trailingBreaks >= 1
        ? {
            ...element.metadata,
            break:
              segment.trailingBreaks >= 1 ? segment.trailingBreaks : undefined,
          }
        : undefined,
  }));
};
