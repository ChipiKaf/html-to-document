import { FileChild, Paragraph } from 'docx';
import { SupportedImageType } from '../../docx.util';
import { ElementConverterDependencies, IBlockConverter } from '../types';
import { DocumentElement, ImageElement, Styles } from 'html-to-document-core';

type DocumentElementType = ImageElement & {
  metadata: {
    imageData: {
      dataBuffer: Uint8Array | Buffer;
      imageType: SupportedImageType;
    };
  };
};

export class ImageBlockConverter
  implements IBlockConverter<DocumentElementType>
{
  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'image';
  }

  async convertEement(
    { converter }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): Promise<FileChild[]> {
    const children = await converter.convertInline(
      {
        ...element,
        scope: 'block',
      },
      cascadedStyles
    );

    return [
      new Paragraph({
        children,
      }),
    ];
  }
}
