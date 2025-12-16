import { ImageRun } from 'docx';
import {
  parseImageType,
  SupportedImageType,
  toBinaryBuffer,
} from '../../docx.util';
import { DocumentElement, ImageElement, Styles } from 'html-to-document-core';
import { imageSize } from 'image-size';
import { ParagraphChild } from 'docx';
import { ElementConverterDependencies, IInlineConverter } from '../types';
import { isServer } from '../../utils/environment';

type DocumentElementType = ImageElement;

export class ImageConverter implements IInlineConverter<DocumentElementType> {
  constructor(
    public readonly config?: {
      /**
       * If true, will not throw an error for unsupported image types.
       * The behavior is undefined in such cases.
       */
      readonly ignoreImageTypeErrors?: boolean;
      // TODO
      // readonly ignoreFetchErrors?: boolean;
    }
  ) {}

  isMatch(element: DocumentElement): element is DocumentElementType {
    return element.type === 'image';
  }

  async convertEement(
    { defaultStyles, styleMapper }: ElementConverterDependencies,
    element: DocumentElementType,
    cascadedStyles: Styles = {}
  ): Promise<ParagraphChild[]> {
    const { imageType = 'png', dataBuffer } = await this.getImageData(element);
    const attributeSizeToStyle = {
      ...(element.attributes?.width
        ? {
            width: `${
              typeof element.attributes.width === 'string'
                ? parseInt(element.attributes.width, 10)
                : element.attributes.width
            }px`,
          }
        : {}),
      ...(element.attributes?.height
        ? {
            height: `${
              typeof element.attributes.height === 'string'
                ? parseInt(element.attributes.height, 10)
                : element.attributes.height
            }px`,
          }
        : {}),
    };
    const mergedStyles = {
      ...defaultStyles?.[element.type],
      ...attributeSizeToStyle,
      ...cascadedStyles,
      ...element.styles,
    };
    const mappedStyles = styleMapper.mapStyles(mergedStyles, element);

    // default image size to 100x100 if size cannot be determined
    let width = 100;
    let height = 100;
    try {
      const { width: w = 100, height: h = 100 } = imageSize(dataBuffer);
      width = w;
      height = h;
      // Ignore errors from image-size
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {}

    // TODO: run fallthrough converter

    const fallbackBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9w8rKQAAAABJRU5ErkJggg==';
    const fallback = toBinaryBuffer(fallbackBase64, 'base64');

    const alt =
      typeof element.attributes?.alt === 'string'
        ? element.attributes?.alt
        : undefined;
    if (imageType === 'svg') {
      return [
        new ImageRun({
          type: imageType,
          altText: alt
            ? {
                name: alt,
                description: alt,
              }
            : undefined,
          fallback: {
            data: fallback,
            type: 'png',
          },
          ...mappedStyles,
          data: dataBuffer,
          transformation: {
            width,
            height,
            ...(mappedStyles.transformation || {}),
          },
        }),
      ];
    }

    const parsedImageType = parseImageType(imageType);

    if (!parsedImageType && !this.config?.ignoreImageTypeErrors) {
      throw new Error(`Unsupported image type: ${imageType}`);
    }

    return [
      new ImageRun({
        type: imageType as Exclude<SupportedImageType, 'svg'>,
        altText: alt
          ? {
              name: alt,
              description: alt,
            }
          : undefined,
        ...(mappedStyles || {}),
        data: dataBuffer,
        transformation: {
          width,
          height,
          ...(mappedStyles.transformation || {}),
        },
      }),
    ];
  }

  private async getImageData(el: ImageElement) {
    const src = el.src || '';
    if (!src) {
      throw new Error('No src defined for image.');
    }

    if (src.startsWith('data:')) {
      // Handle data URIs in the form:
      //   data:[<MIME-type>][;base64],<data>
      const matches = src.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
      if (!matches || matches.length < 3) {
        throw new Error('Invalid data URI');
      }
      const imageType = matches[1]!.split('/')[1]; // e.g. "image/png" becomes "png"
      const base64Data = matches[2]!;
      const dataBuffer = toBinaryBuffer(base64Data, 'base64');
      return { dataBuffer, imageType };
    }

    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('//')
    ) {
      // Handle external URLs: fetch the image data.
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${src}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const dataBuffer = toBinaryBuffer(arrayBuffer);
      const contentType = response.headers.get('content-type');
      let imageType: string | undefined = undefined;
      if (contentType && contentType.startsWith('image/')) {
        imageType = contentType.split('/')[1];
      }
      return { dataBuffer, imageType };
    }

    if (isServer) {
      // Assume it's a local file path.
      // This code path is only supported in Node environments.
      const fsMod = await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        'fs'
      );
      const pathMod = await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        'path'
      );
      if (!fsMod.existsSync(src)) {
        throw new Error(`File not found: ${src}`);
      }
      const dataBuffer = fsMod.readFileSync(src);
      const imageType = pathMod.extname(src).slice(1);

      return { dataBuffer, imageType };
    }

    throw new Error('Image data could not be loaded.');
  }
}
