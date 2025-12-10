import { FileChild, Paragraph } from 'docx';
import {
  DocumentElement,
  filterForScope,
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
    const inheritedForParagraph = filterForScope(
      cascadedStyles,
      element.scope ?? 'block'
    );
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...inheritedForParagraph,
      ...element.styles,
    };

    return converter.convertToBlocks({
      element,
      cascadedStyles: mergedStyles,
      convertBlock: (dependencies, childBlock, index, styles) => {
        const { converter } = dependencies;
        const newChildBlock = converter.runFallthroughNestedBlock(
          dependencies,
          element,
          childBlock,
          styles
        );

        return converter.convertBlock(newChildBlock, styles);
      },
      wrapInlineElements: (inlines, i) => {
        let children = inlines;
        children = converter.runFallthroughWrapConvertedChildren(
          element,
          children,
          mergedStyles,
          i
        );
        return [
          new Paragraph({
            children,
            ...styleMapper.mapStyles(mergedStyles, element),
          }),
        ];
      },
    });
  }
}
