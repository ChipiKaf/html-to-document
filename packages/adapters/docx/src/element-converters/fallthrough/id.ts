import {
  bookmarkUniqueNumericIdGen,
  BookmarkEnd,
  BookmarkStart,
  ParagraphChild,
} from 'docx';
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
  private readonly bookmarkUniqueNumericId = bookmarkUniqueNumericIdGen();

  public isMatch(element: DocumentElement): element is DocumentElementType {
    return (
      (!!element.attributes?.id || Array.isArray(element.metadata?.extraIds)) &&
      !element.metadata?.[convertingIdMetadataKey]
    );
  }

  public async convertElement(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): Promise<ParagraphChild[]> {
    const { converter } = dependencies;

    const children = await converter.convertInline(
      {
        ...element,
        metadata: {
          ...element.metadata,
          [convertingIdMetadataKey]: true, // Mark this element as being processed for ID conversion
        },
      },
      dependencies.stylesheet,
      cascadedStyles
    );

    return this.wrapChildrenWithBookmarks(children, element);
  }

  private getIds(element: DocumentElementType): {
    extraIds: string[];
    id?: string;
  } {
    const id = element.attributes?.id?.toString();
    const extraIds = Array.isArray(element.metadata?.extraIds)
      ? // FIXME: dangerous type assertion
        (element.metadata.extraIds as string[])
      : [];
    return { extraIds, id };
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
    return this.wrapChildrenWithBookmarks(inlineChildren, element);
  }

  fallthroughAttributesNestedBlock(
    dependencies: ElementConverterDependencies,
    element: DocumentElementType,
    childBlock: DocumentElement,
    cascadedStyles?: Styles,
    index: number = 0
  ): DocumentElement {
    if (index !== 0) {
      return childBlock;
    }
    const { extraIds, id } = this.getIds(element);
    const currentChildExtraIds = Array.isArray(childBlock.metadata?.extraIds)
      ? // FIXME: dangerous type assertion
        (childBlock.metadata.extraIds as string[])
      : [];
    return {
      ...childBlock,
      metadata: {
        ...childBlock.metadata,
        extraIds: [...currentChildExtraIds, ...extraIds, ...(id ? [id] : [])],
      },
    };
  }

  private wrapChildrenWithBookmarks(
    children: ParagraphChild[],
    element: DocumentElementType
  ): ParagraphChild[] {
    const { extraIds, id } = this.getIds(element);

    const emptyBookmarks = extraIds.flatMap((extraId) =>
      this.createEmptyBookmark(extraId)
    );

    if (!id) {
      return [...emptyBookmarks, ...children];
    }

    const [bookmarkStart, bookmarkEnd] = this.createBookmarkPair(id);

    return [bookmarkStart, ...emptyBookmarks, ...children, bookmarkEnd];
  }

  private createEmptyBookmark(id: string): ParagraphChild[] {
    return this.createBookmarkPair(id);
  }

  private createBookmarkPair(id: string): [ParagraphChild, ParagraphChild] {
    const numericId = this.bookmarkUniqueNumericId();

    return [
      new BookmarkStart(id, numericId) as unknown as ParagraphChild,
      new BookmarkEnd(numericId) as unknown as ParagraphChild,
    ];
  }
}
