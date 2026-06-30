import {
  cascadeStyles,
  DocumentElement,
  ListItemElement,
  Styles,
} from 'html-to-document-core';
import { ElementConverterDependencies, IBlockConverter } from '../types';
import { Paragraph } from 'docx';

type DocumentElementType = ListItemElement;

export class ListItemConverter implements IBlockConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'list-item';
  }

  convertElement(
    {
      styleMapper,
      converter,
      defaultStyles,
      stylesheet,
      styleMeta,
    }: ElementConverterDependencies,
    element: ListItemElement,
    cascadedStyles: Styles = {}
  ) {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...stylesheet.getComputedStyles(element, cascadedStyles),
    };
    const cascadingStyles = cascadeStyles(
      mergedStyles,
      element.scope,
      styleMeta
    );

    return converter.convertToBlocks({
      stylesheet,
      cascadedStyles: cascadingStyles,
      inlineParagraphs: true,
      element,
      convertBlock: (dependencies, childBlock) => {
        const { converter: conv } = dependencies;
        return conv.convertBlock(childBlock, stylesheet, cascadingStyles);
      },
      wrapInlineElements: (inlines) => {
        const styles = styleMapper.mapStyles(mergedStyles, element);
        return [
          new Paragraph({
            numbering: {
              reference:
                (element.metadata?.reference as string | undefined) || '',
              level: element.level,
            },
            run: {
              ...styles,
            },
            ...styles,
            children: inlines,
          }),
        ];
      },
    });
  }
}
