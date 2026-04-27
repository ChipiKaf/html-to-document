import { BorderStyle, FileChild, Paragraph } from 'docx';
import { DocumentElement, LineElement, Styles } from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';

export class LineConverter implements IBlockConverter<LineElement> {
  isMatch(element: DocumentElement): element is LineElement {
    return element.type === 'line';
  }

  async convertElement(
    {
      converter,
      defaultStyles,
      styleMapper,
      stylesheet,
    }: ElementConverterDependencies,
    element: LineElement,
    cascadedStyles: Styles = {}
  ): Promise<FileChild[]> {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, cascadedStyles),
    };

    const children = converter.runFallthroughWrapConvertedChildren(
      element,
      stylesheet,
      await converter.convertInlineTextOrContent(
        element,
        stylesheet,
        mergedStyles
      ),
      mergedStyles
    );

    return [
      new Paragraph({
        children,
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
