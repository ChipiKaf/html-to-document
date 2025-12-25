import { FileChild, Paragraph } from 'docx';
import {
  cascadeStyles,
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

  async convertElement(
    {
      styleMapper,
      converter,
      defaultStyles,
      styleMeta,
    }: ElementConverterDependencies,
    element: ParagraphElement,
    cascadedStyles: Styles = {}
  ): Promise<FileChild[]> {
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };

    const cascadingStyles = cascadeStyles(
      mergedStyles,
      element.scope,
      styleMeta
    );
    const consumedStyles = filterForScope(mergedStyles, element.scope);

    return converter.convertToBlocks({
      element,
      cascadedStyles: cascadingStyles,
      convertBlock: (dependencies, childBlock) => {
        const { converter } = dependencies;
        const newChildBlock = converter.runFallthroughNestedBlock(
          dependencies,
          element,
          childBlock,
          mergedStyles
        );

        return converter.convertBlock(newChildBlock, mergedStyles);
      },
      wrapInlineElements: (inlines, i) => {
        let children = inlines;
        children = converter.runFallthroughWrapConvertedChildren(
          element,
          children,
          cascadingStyles,
          i
        );
        return [
          new Paragraph({
            children,
            ...styleMapper.mapStyles(consumedStyles, element),
          }),
        ];
      },
    });
  }
}
