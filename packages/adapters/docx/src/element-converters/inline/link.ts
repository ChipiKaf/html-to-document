import { ExternalHyperlink, InternalHyperlink, ParagraphChild } from 'docx';
import { DocumentElement, Styles, TextElement } from 'html-to-document-core';
import { ElementConverterDependencies, IInlineConverter } from '../types';

type DocumentElementType = TextElement & {
  attributes: {
    href: string;
  };
};

export class LinkConverter implements IInlineConverter<DocumentElementType> {
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'text' && !!element.attributes?.href;
  }

  async convertEement(
    { converter, defaultStyles }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): Promise<ParagraphChild[]> {
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...cascadedStyles,
      ...element.styles,
    };
    const href = element.attributes.href;
    const children =
      (await converter.convertInlineTextOrContent(element, mergedStyles)) ?? [];
    if (href.startsWith('#')) {
      return [
        new InternalHyperlink({
          anchor: href.slice(1),
          children,
        }),
      ];
    }

    return [
      new ExternalHyperlink({
        link: href,
        children,
      }),
    ];
  }
}
