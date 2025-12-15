import { Bookmark, ParagraphChild } from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import {
  ElementConverterDependencies,
  IFallthroughAttributesNestedBlockConverter,
  IFallthroughConvertedChildrenWrapperConverter,
  IInlineConverter,
} from '../types';

const convertingIdMetadataKey = 'isConvertingId';

type DocumentElementType = DocumentElement &
  (
    | {
        attributes: {
          id: string;
        };
      }
    | {
        metadata: {
          extraIds: string[];
        };
      }
  );

export class IdInlineConverter
  implements
    IInlineConverter<DocumentElementType>,
    IFallthroughConvertedChildrenWrapperConverter<DocumentElementType>,
    IFallthroughAttributesNestedBlockConverter<DocumentElementType>
{
  public isMatch(element: DocumentElement): element is DocumentElementType {
    return (
      (!!element.attributes?.id || Array.isArray(element.metadata?.extraIds)) &&
      !element.metadata?.[convertingIdMetadataKey]
    );
  }

  public async convertEement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): Promise<ParagraphChild[]> {
    const { converter } = dependencies;

    const ids = this.getIds(element);

    const children = await converter.convertInline(
      {
        ...element,
        metadata: {
          ...element.metadata,
          [convertingIdMetadataKey]: true, // Mark this element as being processed for ID conversion
        },
      },
      cascadedStyles
    );

    return ids.reduce((prevChildren, currentId) => {
      return [
        new Bookmark({
          children: prevChildren,
          id: currentId,
        }),
      ];
    }, children);
  }

  private getIds(element: DocumentElementType): string[] {
    const id = element.attributes?.id?.toString();
    const extraIds = Array.isArray(element.metadata?.extraIds)
      ? (element.metadata.extraIds as string[])
      : [];
    return [...extraIds, ...(id ? [id] : [])];
  }

  fallthroughWrapConvertedChildren(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    inlineChildren: ParagraphChild[],
    cascadedStyles?: Styles,
    index: number = 0
  ): ParagraphChild[] {
    if (index !== 0) {
      // In case we have multiple blocks this would be applied to, we only apply it to the first one.
      return inlineChildren;
    }
    const ids = this.getIds(element);

    const wrappedChildren = ids.reduce((prevChildren, id) => {
      return [
        new Bookmark({
          children: prevChildren,
          id,
        }),
      ];
    }, inlineChildren);

    return wrappedChildren;
  }

  fallthroughAttributesNestedBlock(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    childBlock: DocumentElement
  ): DocumentElement {
    const ids = this.getIds(element);
    return {
      ...childBlock,
      metadata: {
        ...childBlock.metadata,
        extraIds: [...ids],
      },
    };
  }
}
