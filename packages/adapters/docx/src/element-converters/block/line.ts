import { BorderStyle, FileChild, Paragraph } from 'docx';
import { DocumentElement, LineElement, Styles } from 'html-to-document-core';
import { IElementConverter } from '../block-converter.interface';
import { ElementConverterDependencies } from '../types';

export class LineConverter implements IElementConverter<LineElement> {
  isMatch(element: DocumentElement): element is LineElement {
    return element.type === 'line';
  }

  convertEement(
    { styleMapper, defaultStyles }: ElementConverterDependencies,
    element: LineElement,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };

    return [
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6, // Thickness of the line (in eighths of a point)
            color: '808080', // Color can be set explicitly, e.g., "000000"
            space: 1, // Space between the text (if any) and the line
          },
        },
        ...styleMapper.mapStyles(mergedStyles, element),
      }),
    ];
  }
}
