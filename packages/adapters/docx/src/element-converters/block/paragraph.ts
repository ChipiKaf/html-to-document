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
      stylesheet,
      styleMeta,
    }: ElementConverterDependencies,
    element: ParagraphElement,
    cascadedStyles: Styles = {}
  ): Promise<FileChild[]> {
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = stylesheet.getComputedStyles(element, cascadedStyles);

    const cascadingStyles = cascadeStyles(
      mergedStyles,
      element.scope,
      styleMeta
    );
    const consumedStyles = filterForScope(mergedStyles, element.scope);

    return converter.convertToBlocks({
      element,
      stylesheet,
      cascadedStyles: cascadingStyles,
      convertBlock: (dependencies, childBlock) => {
        const { converter } = dependencies;
        const newChildBlock = converter.runFallthroughNestedBlock(
          dependencies,
          element,
          childBlock,
          mergedStyles
        );

        return converter.convertBlock(newChildBlock, stylesheet, mergedStyles);
      },
      wrapInlineElements: (inlines, i) => {
        let children = inlines;
        children = converter.runFallthroughWrapConvertedChildren(
          element,
          stylesheet,
          children,
          cascadingStyles,
          i
        );
        const styles = styleMapper.mapStyles(consumedStyles, element);
        return [
          new Paragraph({
            children,
            ...styles,
            run: {
              ...styles,
            },
          }),
        ];
      },
    });
  }
}
