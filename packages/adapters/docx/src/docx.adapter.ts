import {
  Document,
  Paragraph,
  Packer,
  Header,
  Footer,
  ISectionOptions,
  Table,
  INumberingOptions,
} from 'docx';
import {
  DocumentElement,
  IConverterDependencies,
  StyleMapper,
  IDocumentConverter,
  initStyleMeta,
} from 'html-to-document-core';

import { NumberFormat, AlignmentType } from 'docx';
import { ElementConverter } from './element-converters/converter';
import { DocxAdapterConfig, OptionalDocumentOptions } from './docx.types';
import { isServer } from './utils/environment';
import { pipe } from 'remeda';

export class DocxAdapter implements IDocumentConverter {
  private _mapper: StyleMapper;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};
  private _docxElementConverter: ElementConverter;
  private readonly documentOptions: NonNullable<
    DocxAdapterConfig['documentOptions']
  >;
  private readonly defaultSectionOptions: NonNullable<
    DocxAdapterConfig['defaultSectionOptions']
  >;

  constructor(
    {
      styleMapper,
      defaultStyles,
      styleMeta = initStyleMeta(),
    }: IConverterDependencies,
    config?: DocxAdapterConfig
  ) {
    this._mapper = styleMapper;
    this._defaultStyles = { ...defaultStyles };

    const docxElementConverter = new ElementConverter(
      {
        styleMapper: this._mapper,
        defaultStyles: this._defaultStyles,
        styleMeta,
      },
      config
    );
    this._docxElementConverter = docxElementConverter;
    this.documentOptions = config?.documentOptions ?? {};
    this.defaultSectionOptions = config?.defaultSectionOptions ?? {};
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
        ...this.defaultSectionOptions,
        children,
        ...(header ? { headers: { default: header } } : {}),
        ...(footer ? { footers: { default: footer } } : {}),
      };
      docSections.push(options);
    }

    const buildOrderedNumberingConfig =
      (): INumberingOptions['config'][number] => {
        return {
          reference: 'ordered',
          levels: Array.from({ length: 9 }, (_, i) => ({
            level: i,
            format: NumberFormat.DECIMAL,
            text: '%' + (i + 1) + '.',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 240 * (i + 1), hanging: 240 } },
            },
          })),
        };
      };
    const buildUnorderedNumberingConfig =
      (): INumberingOptions['config'][number] => {
        return {
          reference: 'unordered',
          levels: Array.from({ length: 9 }, (_, i) => ({
            level: i,
            format: NumberFormat.BULLET,
            text: ['•', '◦', '▪'][i % 3],
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 240 * (i + 1), hanging: 240 } },
            },
          })),
        };
      };
    const addDefaultNumberingConfig = (
      config: OptionalDocumentOptions
    ): OptionalDocumentOptions => {
      const unorderedNumbering =
        config.numbering?.config?.find((n) => n.reference === 'unordered') ??
        buildUnorderedNumberingConfig();
      const orderedNumbering =
        config.numbering?.config?.find((n) => n.reference === 'ordered') ??
        buildOrderedNumberingConfig();
      return {
        ...config,
        numbering: {
          ...config.numbering,
          config: [
            unorderedNumbering,
            orderedNumbering,
            ...(config.numbering?.config?.filter(
              (n) => n.reference !== 'unordered' && n.reference !== 'ordered'
            ) ?? []),
          ],
        },
      };
    };
    const addDefaultOptions = (
      options: OptionalDocumentOptions
    ): OptionalDocumentOptions => {
      return pipe(options, addDefaultNumberingConfig);
    };

    const documentOptions: OptionalDocumentOptions =
      typeof this.documentOptions === 'function'
        ? this.documentOptions(addDefaultOptions({}))
        : addDefaultOptions(this.documentOptions);

    const doc = new Document({
      ...documentOptions,
      sections: docSections,
    });

    // Pack the document to a Buffer.
    if (isServer) {
      return Packer.toBuffer(doc);
    }
    return Packer.toBlob(doc);
  }

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private async convertElement(
    el: DocumentElement
  ): Promise<(Paragraph | Table)[]> {
    return this._docxElementConverter.convertBlock(el);
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
