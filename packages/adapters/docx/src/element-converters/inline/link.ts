import { FileChild, InternalHyperlink, Paragraph } from 'docx';
import {
  DocumentElement,
  ParagraphElement,
  Styles,
  TextElement,
} from 'html-to-document-core';
import { IElementConverter } from '../block-converter.interface';
import { ElementConverterDependencies } from '../types';

type DocumentElementType = TextElement & {
  attributes: {
    href: string;
  };
};

export class ParagraphConverter
  implements IElementConverter<DocumentElementType>
{
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'text' && !!element.attributes?.href;
  }

  convertEement(
    { styleMapper, converter, defaultStyles }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): FileChild[] {
    // Paragraph element must only have inline children or else it could corrupt the document structure.
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };
    const href = element.attributes.href;
    if (href.startsWith('#')) {
      return [
        new InternalHyperlink({
          anchor: href.slice(1),
          // children: converter.convertInline(element., mergedStyles),
        }),
      ];
    }
    const children =
      element.content?.flatMap((child) =>
        converter.convertInline(child, mergedStyles)
      ) ?? [];

    return [
      new Paragraph({
        children,
        ...styleMapper.mapStyles(mergedStyles, element),
      }),
    ];
  }
}
