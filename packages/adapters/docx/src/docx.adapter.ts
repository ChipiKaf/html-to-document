import {
  Document,
  Paragraph,
  Packer,
  ImageRun,
  IImageOptions,
  Header,
  Footer,
  ISectionOptions,
  Table,
} from 'docx';
import {
  DocumentElement,
  ImageElement,
  Styles,
  IConverterDependencies,
  StyleMapper,
  IDocumentConverter,
} from 'html-to-document-core';

import { NumberFormat, AlignmentType } from 'docx';
import { toBinaryBuffer } from './docx.util';
import { ElementConverter } from './element-converters/converter';

export class DocxAdapter implements IDocumentConverter {
  private _mapper: StyleMapper;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};
  private _docxElementConverter: ElementConverter;

  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    this._mapper = styleMapper;
    this._defaultStyles = { ...defaultStyles };

    const docxElementConverter = new ElementConverter({
      styleMapper: this._mapper,
      defaultStyles: this._defaultStyles,
    });
    this._docxElementConverter = docxElementConverter;
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    const { sections, globalHeader, globalFooter } =
      this.organizeSections(elements);

    const globalHeaderDocx = globalHeader
      ? await this.convertHeader(globalHeader)
      : undefined;
    const globalFooterDocx = globalFooter
      ? await this.convertFooter(globalFooter)
      : undefined;

    const docSections: ISectionOptions[] = [];
    const sectionList = sections.length ? sections : [{ children: [] }];
    for (const sec of sectionList) {
      const childrenArrays = await Promise.all(
        sec.children.map((el) => this.convertElement(el))
      );
      const children = childrenArrays.flat();
      const header = sec.header
        ? await this.convertHeader(sec.header)
        : globalHeaderDocx;
      const footer = sec.footer
        ? await this.convertFooter(sec.footer)
        : globalFooterDocx;
      const options: ISectionOptions = {
        children,
        ...(header ? { headers: { default: header } } : {}),
        ...(footer ? { footers: { default: footer } } : {}),
      };
      docSections.push(options);
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'unordered',
            levels: [
              {
                level: 0,
                format: NumberFormat.BULLET,
                text: '•',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 240, hanging: 240 } } },
              },
              {
                level: 1,
                format: NumberFormat.BULLET,
                text: '◦',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 } } },
              },
              {
                level: 2,
                format: NumberFormat.BULLET,
                text: '▪',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 240 } } },
              },
            ],
          },
          {
            reference: 'ordered',
            levels: [
              {
                level: 0,
                format: NumberFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 240, hanging: 240 } } },
              },
              {
                level: 1,
                format: NumberFormat.DECIMAL,
                text: '%2.',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 } } },
              },
            ],
          },
        ],
      },
      sections: docSections,
    });

    // Pack the document to a Buffer.
    if (typeof window !== 'undefined') {
      return await Packer.toBlob(doc);
    } else {
      return await Packer.toBuffer(doc);
    }
  }

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private async convertElement(
    el: DocumentElement
  ): Promise<(Paragraph | Table)[]> {
    switch (el.type) {
      case 'image':
        return [
          new Paragraph({
            children: [await this.convertImage(el as ImageElement)],
          }),
        ];
    }

    return this._docxElementConverter.convertBlock(el);
  }

  // Note: Ensure this function can use asynchronous operations
  private async convertImage(
    _el: DocumentElement,
    styles: Styles = {}
  ): Promise<ImageRun> {
    const el = _el as ImageElement;
    const mergedStyles = {
      ...this._defaultStyles?.[el.type],
      ...styles,
      ...el.styles,
    };

    let dataBuffer: Buffer | Uint8Array | undefined;
    let imageType: IImageOptions['type'] = 'png'; // default type

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
      imageType = matches[1]!.split('/')[1] as IImageOptions['type']; // e.g. "image/png" becomes "png"
      const base64Data = matches[2]!;
      dataBuffer = toBinaryBuffer(base64Data, 'base64');
    } else if (
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
      dataBuffer = toBinaryBuffer(arrayBuffer);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        imageType = contentType.split('/')[1] as IImageOptions['type'];
      }
    } else if (typeof window === 'undefined') {
      // Assume it's a local file path.
      // This code path is only supported in Node environments.
      const fsMod = await import(/* @vite-ignore */ 'fs');
      const pathMod = await import(/* @vite-ignore */ 'path');
      if (!fsMod.existsSync(src)) {
        throw new Error(`File not found: ${src}`);
      }
      dataBuffer = fsMod.readFileSync(src);
      imageType =
        (pathMod.extname(src).slice(1) as IImageOptions['type']) || 'png';
    }

    if (!dataBuffer) {
      throw new Error('Image data could not be loaded.');
    }
    // Ensure dataBuffer is Buffer (Node) or Uint8Array (browser)
    if (typeof Buffer !== 'undefined' && !(dataBuffer instanceof Buffer)) {
      dataBuffer = Buffer.from(dataBuffer);
    } else if (
      typeof Buffer === 'undefined' &&
      !(dataBuffer instanceof Uint8Array)
    ) {
      dataBuffer = new Uint8Array(dataBuffer) as Buffer;
    }

    // Determine original image dimensions (use default 100x100 if unable to detect)
    let width = 100;
    let height = 100;

    try {
      if (typeof window === 'undefined') {
        // Dynamically load 'image-size' (Node‑only) so browser bundles stay clean
        const sizeOf = await import(/* @vite-ignore */ 'image-size');
        const { width: w = 100, height: h = 100 } = sizeOf.imageSize(
          dataBuffer as Buffer
        );
        width = w * 0.7;
        height = h * 0.7;
      } else {
        // Browser: attempt to read natural dimensions from an <img>
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            width = (img.naturalWidth || 100) * 0.7;
            height = (img.naturalHeight || 100) * 0.7;
            resolve();
          };
          img.onerror = () => resolve(); // fall back to default on error
          img.src = src;
        });
      }
    } catch {
      // Unable to determine size, using default 100×100
    }
    // Add fallback for SVGs
    const mappedStyles = this._mapper.mapStyles(mergedStyles, el);
    if (imageType === 'svg') {
      // 1x1 transparent PNG fallback
      const fallbackBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9w8rKQAAAABJRU5ErkJggg==';
      const fallback = toBinaryBuffer(fallbackBase64, 'base64');
      return new ImageRun({
        data: dataBuffer!,
        type: imageType,
        fallback: { data: fallback, type: 'png' },
        ...mappedStyles,
        transformation: {
          width,
          height,
          ...(mappedStyles?.transformation || {}),
        },
      });
    }
    return new ImageRun({
      data: dataBuffer!,
      ...this._mapper.mapStyles(mergedStyles, el),
      transformation: {
        width,
        height,
        ...(mappedStyles?.transformation || {}),
      },
      type: imageType,
    });
  }

  private organizeSections(elements: DocumentElement[]): {
    sections: {
      children: DocumentElement[];
      header?: DocumentElement;
      footer?: DocumentElement;
    }[];
    globalHeader?: DocumentElement;
    globalFooter?: DocumentElement;
  } {
    const sections: {
      children: DocumentElement[];
      header?: DocumentElement;
      footer?: DocumentElement;
    }[] = [];
    let current: {
      children: DocumentElement[];
      header?: DocumentElement;
      footer?: DocumentElement;
    } = { children: [] };
    let globalHeader: DocumentElement | undefined;
    let globalFooter: DocumentElement | undefined;

    const pushCurrent = () => {
      if (current.children.length) {
        sections.push(current);
        current = { children: [] };
      }
    };

    for (const el of elements) {
      switch (el.type) {
        case 'header':
          globalHeader = el;
          break;
        case 'footer':
          globalFooter = el;
          break;
        case 'page-break':
          pushCurrent();
          break;
        case 'page': {
          pushCurrent();
          const content = el.content || [];
          const pageHeader = content.find((c) => c.type === 'header');
          const pageFooter = content.find((c) => c.type === 'footer');
          const children = content.filter(
            (c) => c.type !== 'header' && c.type !== 'footer'
          );
          sections.push({ children, header: pageHeader, footer: pageFooter });
          break;
        }
        default:
          current.children.push(el);
      }
    }
    pushCurrent();
    return { sections, globalHeader, globalFooter };
  }

  private async convertHeader(el: DocumentElement): Promise<Header> {
    let childrenArrays = await Promise.all(
      (el.content || []).map((c) => this.convertElement(c))
    );

    if ((!el.content || el.content.length === 0) && el.text) {
      const paragraphEl: DocumentElement = {
        type: 'paragraph',
        text: el.text,
        styles: el.styles,
        attributes: el.attributes,
        metadata: { tagName: 'p' },
      };
      childrenArrays.push(await this.convertElement(paragraphEl));
    }

    const children = childrenArrays
      .flat()
      .filter(
        (c): c is Paragraph | Table =>
          c instanceof Paragraph || c instanceof Table
      );
    return new Header({ children });
  }

  private async convertFooter(el: DocumentElement): Promise<Footer> {
    let childrenArrays = await Promise.all(
      (el.content || []).map((c) => this.convertElement(c))
    );

    if ((!el.content || el.content.length === 0) && el.text) {
      const paragraphEl: DocumentElement = {
        type: 'paragraph',
        text: el.text,
        styles: el.styles,
        attributes: el.attributes,
        metadata: { tagName: 'p' },
      };
      childrenArrays.push(await this.convertElement(paragraphEl));
    }

    const children = childrenArrays
      .flat()
      .filter(
        (c): c is Paragraph | Table =>
          c instanceof Paragraph || c instanceof Table
      );
    return new Footer({ children });
  }
}
