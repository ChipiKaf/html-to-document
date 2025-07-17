import { Bookmark, ParagraphChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import { ElementConverterDependencies, IInlineConverter } from '../types';

const convertingIdMetadataKey = 'isConvertingId';

type DocumentElementType = DocumentElement & {
  attributes: {
    id: string;
  };
};

export class IdInlineConverter
  implements IInlineConverter<DocumentElementType>
{
  public isMatch(element: DocumentElement): element is DocumentElementType {
    return (
      !!element.attributes?.id && !element.metadata?.[convertingIdMetadataKey]
    );
  }

  public convertEement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): ParagraphChild[] {
    const { converter } = dependencies;

    const id = element.attributes.id;

    const children = converter.convertInline(
      {
        ...element,
        metadata: {
          ...element.metadata,
          [convertingIdMetadataKey]: true, // Mark this element as being processed for ID conversion
        },
      },
      cascadedStyles
    );

    return [
      new Bookmark({
        children,
        id,
      }),
    ];
  }

  public convertInlineChildren(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    inlineChildren: DocumentElement[],
    cascadedStyles: Styles = {}
  ) {
    const { converter } = dependencies;

    const id = element.attributes.id;

    const children = inlineChildren.flatMap((child) =>
      converter.convertInline(child, cascadedStyles)
    );

    return [
      new Bookmark({
        children,
        id,
      }),
    ];
  }
}
