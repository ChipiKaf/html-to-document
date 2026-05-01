import {
  Document,
  Paragraph,
  Packer,
  Header,
  Footer,
  ISectionOptions,
  Table,
  INumberingOptions,
  IStylesOptions,
  IParagraphStylePropertiesOptions,
  IRunStylePropertiesOptions,
  IPageSizeAttributes,
} from 'docx';
import {
  createBaseStylesheet,
  DocumentElement,
  IConverterDependencies,
  IDocumentConverter,
  IStylesheet,
  initStyleMeta,
  AtRule,
} from 'html-to-document-core';

import { NumberFormat, AlignmentType } from 'docx';
import { DocxStyleMapper } from './docx-style-mapper';
import {
  createBaseHeadingElement,
  DOCX_DEFAULT_STYLE_SELECTORS,
  DocxStylesheet,
  hasStyles,
} from './docx-stylesheet';
import { ElementConverter } from './element-converters/converter';
import { DocxAdapterConfig, OptionalDocumentOptions } from './docx.types';
import { isServer } from './utils/environment';
import { mergeDeep, pipe } from 'remeda';
import { lengthToTwips } from './utils/parse';
import { TWIPS_PER_INCH, TWIPS_PER_MM } from './utils/unit-conversion';

type NormalizedPageRule = {
  /** as twips number */
  marginTop?: number;
  /** as twips number */
  marginRight?: number;
  /** as twips number */
  marginBottom?: number;
  /** as twips number */
  marginLeft?: number;
  size?:
    | {
        kind: 'code';
        code: number;
      }
    | {
        kind: 'explicit';
        /** as twips number */
        width: number;
        /** as twips number */
        height: number;
      };
  /** Is not set if explicit size is provided, otherwise can be set based on orientation or size code */
  orientation?: 'landscape' | 'portrait';
};

const docxSizeCodeMap: Record<string, number> = {
  letter: 1,
  ledger: 3,
  legal: 5,
  A3: 8,
  A4: 9,
  A5: 11,
  'JIS-B4': 12,
  'JIS-B5': 13,
  B4: 34,
  B5: 35,
} as const;

const docxCodeSizesMap: Record<
  /** docx code */
  number,
  {
    /** as twips number */
    width: number;
    /** as twips number */
    height: number;
  }
> = {
  1: { width: 8.5 * TWIPS_PER_INCH, height: 11 * TWIPS_PER_INCH },
  3: { width: 11 * TWIPS_PER_INCH, height: 17 * TWIPS_PER_INCH },
  5: { width: 8.5 * TWIPS_PER_INCH, height: 14 * TWIPS_PER_INCH },
  8: {
    width: Math.round(297 * TWIPS_PER_MM),
    height: Math.round(420 * TWIPS_PER_MM),
  },
  9: {
    width: Math.round(210 * TWIPS_PER_MM),
    height: Math.round(297 * TWIPS_PER_MM),
  },
  11: {
    width: Math.round(148 * TWIPS_PER_MM),
    height: Math.round(210 * TWIPS_PER_MM),
  },
  12: { width: 257 * TWIPS_PER_MM, height: 364 * TWIPS_PER_MM },
  13: { width: 182 * TWIPS_PER_MM, height: 257 * TWIPS_PER_MM },
  34: { width: 257 * TWIPS_PER_MM, height: 364 * TWIPS_PER_MM },
  35: { width: 182 * TWIPS_PER_MM, height: 257 * TWIPS_PER_MM },
} as const;

export class DocxAdapter implements IDocumentConverter {
  private _mapper: DocxStyleMapper;
  private _defaultStyles: IConverterDependencies['defaultStyles'] = {};
  private _stylesheet: DocxStylesheet;
  private _docxElementConverter: ElementConverter;
  private readonly documentOptions: NonNullable<
    DocxAdapterConfig['documentOptions']
  >;
  private readonly defaultSectionOptions: NonNullable<
    DocxAdapterConfig['defaultSectionOptions']
  >;

  private readonly _beforeConvert: NonNullable<
    DocxAdapterConfig['beforeConvert']
  >;

  constructor(
    {
      defaultStyles,
      stylesheet = createBaseStylesheet(),
      styleMeta = initStyleMeta(),
    }: IConverterDependencies,
    config?: DocxAdapterConfig
  ) {
    this._mapper = config?.styleMapper ?? new DocxStyleMapper();
    if (config?.styleMappings) {
      this._mapper.addMapping(config.styleMappings);
    }
    this._defaultStyles = { ...defaultStyles };
    this._stylesheet = this.createAdapterStylesheet(stylesheet);

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
    this._beforeConvert =
      config?.beforeConvert ??
      (({ docxDocumentOptions: docxDocument }) => docxDocument);
  }

  async convert(
    elements: DocumentElement[],
    stylesheet?: IStylesheet
  ): Promise<Buffer | Blob> {
    const effectiveStylesheet = this.mergeStylesheet(stylesheet);
    const { sections, globalHeader, globalFooter } =
      this.organizeSections(elements);

    const globalHeaderDocx = globalHeader
      ? await this.convertHeader(globalHeader, effectiveStylesheet)
      : undefined;
    const globalFooterDocx = globalFooter
      ? await this.convertFooter(globalFooter, effectiveStylesheet)
      : undefined;

    const stylesheetPageRules = effectiveStylesheet.getAtRules('page');
    const defaultPageRules = stylesheetPageRules.filter((r) => !r.prelude);

    const validatedPageRules = this.normalizePageRules(defaultPageRules);

    const pageSize: Partial<IPageSizeAttributes> | undefined =
      validatedPageRules.size?.kind === 'code'
        ? {
            code: validatedPageRules.size.code,
            orientation: validatedPageRules.orientation,
            width: docxCodeSizesMap[validatedPageRules.size.code]?.width,
            height: docxCodeSizesMap[validatedPageRules.size.code]?.height,
          }
        : validatedPageRules.size?.kind === 'explicit'
          ? {
              width: validatedPageRules.size.width,
              height: validatedPageRules.size.height,
            }
          : undefined;

    // TODO: consider first page rules
    // const firstPageRules = stylesheetPageRules.filter(
    //   (r) => r.prelude === ':first'
    // );
    // const firstPageValidatedRules = this.normalizePageRules(firstPageRules);

    const docSections: ISectionOptions[] = [];
    const sectionList = sections.length ? sections : [{ children: [] }];
    for (const sec of sectionList) {
      const childrenArrays = await Promise.all(
        sec.children.map((el) => this.convertElement(el, effectiveStylesheet))
      );
      const children = childrenArrays.flat();
      const header = sec.header
        ? await this.convertHeader(sec.header, effectiveStylesheet)
        : globalHeaderDocx;
      const footer = sec.footer
        ? await this.convertFooter(sec.footer, effectiveStylesheet)
        : globalFooterDocx;
      const options: ISectionOptions = {
        ...this.defaultSectionOptions,
        properties: {
          ...this.defaultSectionOptions?.properties,
          page: {
            ...this.defaultSectionOptions?.properties?.page,
            margin: {
              ...this.defaultSectionOptions?.properties?.page?.margin,
              // TODO: consider supporting unitless numbers
              top:
                validatedPageRules.marginTop !== undefined
                  ? validatedPageRules.marginTop
                  : this.defaultSectionOptions?.properties?.page?.margin?.top,
              right:
                validatedPageRules.marginRight !== undefined
                  ? validatedPageRules.marginRight
                  : this.defaultSectionOptions?.properties?.page?.margin?.right,
              bottom:
                validatedPageRules.marginBottom !== undefined
                  ? validatedPageRules.marginBottom
                  : this.defaultSectionOptions?.properties?.page?.margin
                      ?.bottom,
              left:
                validatedPageRules.marginLeft !== undefined
                  ? validatedPageRules.marginLeft
                  : this.defaultSectionOptions?.properties?.page?.margin?.left,
            },
            size: {
              ...this.defaultSectionOptions?.properties?.page?.size,
              // TODO: add supprot for size values like "A4", "Letter", etc. and also numbers with units
              ...pageSize,
            },
          },
        },
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
      return pipe(options, addDefaultNumberingConfig, (config) =>
        this.addAdapterDocumentStyles(config, effectiveStylesheet)
      );
    };

    const documentOptions: OptionalDocumentOptions =
      typeof this.documentOptions === 'function'
        ? this.documentOptions(addDefaultOptions({}))
        : addDefaultOptions(this.documentOptions);

    const finalDocumentOptions = this._beforeConvert({
      docxDocumentOptions: {
        ...documentOptions,
        sections: docSections,
      },
      stylesheet: effectiveStylesheet,
      elements,
    });
    const doc = new Document(finalDocumentOptions);

    // Pack the document to a Buffer.
    if (isServer) {
      return Packer.toBuffer(doc);
    }
    return Packer.toBlob(doc);
  }

  private createAdapterStylesheet(stylesheet: IStylesheet): DocxStylesheet {
    return new DocxStylesheet(stylesheet.getStatements());
  }

  private addAdapterDocumentStyles(
    options: OptionalDocumentOptions,
    stylesheet: IStylesheet = this._stylesheet
  ): OptionalDocumentOptions {
    const defaults = this.buildDefaultStyles(stylesheet);

    return {
      ...options,
      styles: {
        ...options.styles,
        default: mergeDeep(defaults, options.styles?.default ?? {}),
        // Intentionally not adding 'p' styles to normal, as a wrapper could have been something other than 'p', but then the 'p' styles would be added to that as well.
      },
    };
  }

  private buildDefaultStyles(
    stylesheet: IStylesheet = this._stylesheet
  ): NonNullable<IStylesOptions['default']> {
    type IDefaultStyleOptions = NonNullable<
      OptionalDocumentOptions['styles']
    >['default'];
    const headingDefaults = DOCX_DEFAULT_STYLE_SELECTORS.reduce<
      NonNullable<IStylesOptions['default']>
    >((defaults, selector) => {
      const level = Number(selector.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      const styles = stylesheet.getComputedStylesBySelector(selector);

      if (!hasStyles(styles)) {
        return defaults;
      }

      const element = createBaseHeadingElement(level);

      return {
        ...defaults,
        [`heading${level}`]: this.buildDocxStyleDefinition(styles, element),
      } satisfies IDefaultStyleOptions;
    }, {});

    // TODO: add hyperlink

    return {
      ...headingDefaults,
    };
  }

  private buildDocxStyleDefinition(
    styles: Record<string, string | number>,
    element: DocumentElement
  ): {
    paragraph: IParagraphStylePropertiesOptions;
    run: IRunStylePropertiesOptions;
  } {
    const mappedStyles = this._mapper.mapStyles(styles, element);

    return {
      paragraph: mappedStyles as IParagraphStylePropertiesOptions,
      run: mappedStyles as IRunStylePropertiesOptions,
    };
  }

  private normalizePageRules(
    atRules: readonly AtRule<'page'>[]
  ): NormalizedPageRule {
    const merged = atRules.reduce(
      (acc, r) => {
        return {
          ...acc,
          ...r.descriptors,
        };
      },
      {} as NonNullable<(typeof atRules)[number]['descriptors']>
    );

    const normalized: NormalizedPageRule = {};
    if (merged.margin) {
      // expand margin shorthand into individual sides, since docx library requires them separately
      // margin examples "1in" "1in 2cm" "1in 2cm 3mm" "1in 2cm 3mm 4px"
      const margins = merged.margin
        .toString()
        .trim()
        .split(/\s+/)
        .map((token) => {
          if (!token) return undefined;
          const twips = lengthToTwips(token);
          return twips;
        });
      if (margins.length === 1) {
        normalized.marginTop = margins[0];
        normalized.marginRight = margins[0];
        normalized.marginBottom = margins[0];
        normalized.marginLeft = margins[0];
      } else if (margins.length === 2) {
        normalized.marginTop = margins[0];
        normalized.marginBottom = margins[0];
        normalized.marginRight = margins[1];
        normalized.marginLeft = margins[1];
      } else if (margins.length === 3) {
        normalized.marginTop = margins[0];
        normalized.marginRight = margins[1];
        normalized.marginLeft = margins[1];
        normalized.marginBottom = margins[2];
      } else if (margins.length >= 4) {
        normalized.marginTop = margins[0];
        normalized.marginRight = margins[1];
        normalized.marginBottom = margins[2];
        normalized.marginLeft = margins[3];
      }
    }

    if (merged.marginTop !== undefined)
      normalized.marginTop = lengthToTwips(merged.marginTop);
    if (merged.marginRight !== undefined)
      normalized.marginRight = lengthToTwips(merged.marginRight);
    if (merged.marginBottom !== undefined)
      normalized.marginBottom = lengthToTwips(merged.marginBottom);
    if (merged.marginLeft !== undefined)
      normalized.marginLeft = lengthToTwips(merged.marginLeft);

    const sizeSplitted = merged.size?.toString().split(/\s+/);
    // If last is "landscape" or "portrait", treat it as orientation, otherwise ignore
    if (sizeSplitted) {
      const sizeName = sizeSplitted[0];
      const sizeCode = sizeName ? docxSizeCodeMap[sizeName] : undefined;

      if (sizeCode) {
        normalized.size = { kind: 'code', code: sizeCode };
        const lastToken = sizeSplitted[sizeSplitted.length - 1]?.toLowerCase();
        if (lastToken === 'landscape' || lastToken === 'portrait') {
          normalized.orientation = lastToken;
          sizeSplitted.pop();
        }
      } else {
        const widthToken = sizeSplitted[0];
        const heightToken = sizeSplitted[1] ?? sizeSplitted[0]; // if only one value is provided, use it for both width and height
        const width = lengthToTwips(widthToken);
        const height = lengthToTwips(heightToken);
        if (width !== undefined && height !== undefined) {
          normalized.size = {
            kind: 'explicit',
            width,
            height,
          };
        }
      }
    }

    return normalized;
  }

  /**
   * Converts a DocumentElement (or an array of them) into an array of docx elements.
   */
  private async convertElement(
    el: DocumentElement,
    stylesheet: IStylesheet
  ): Promise<(Paragraph | Table)[]> {
    return this._docxElementConverter.convertBlock(el, stylesheet);
  }

  private mergeStylesheet(stylesheet?: IStylesheet): DocxStylesheet {
    if (!stylesheet) {
      return this._stylesheet;
    }

    return new DocxStylesheet([
      ...this._stylesheet.getStatements(),
      ...stylesheet.getStatements(),
    ]);
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

  private async convertHeader(
    el: DocumentElement,
    stylesheet: IStylesheet
  ): Promise<Header> {
    let childrenArrays = await Promise.all(
      (el.content || []).map((c) => this.convertElement(c, stylesheet))
    );

    if ((!el.content || el.content.length === 0) && el.text) {
      const paragraphEl: DocumentElement = {
        type: 'paragraph',
        text: el.text,
        styles: el.styles,
        attributes: el.attributes,
        metadata: { tagName: 'p' },
      };
      childrenArrays.push(await this.convertElement(paragraphEl, stylesheet));
    }

    const children = childrenArrays
      .flat()
      .filter(
        (c): c is Paragraph | Table =>
          c instanceof Paragraph || c instanceof Table
      );
    return new Header({ children });
  }

  private async convertFooter(
    el: DocumentElement,
    stylesheet: IStylesheet
  ): Promise<Footer> {
    let childrenArrays = await Promise.all(
      (el.content || []).map((c) => this.convertElement(c, stylesheet))
    );

    if ((!el.content || el.content.length === 0) && el.text) {
      const paragraphEl: DocumentElement = {
        type: 'paragraph',
        text: el.text,
        styles: el.styles,
        attributes: el.attributes,
        metadata: { tagName: 'p' },
      };
      childrenArrays.push(await this.convertElement(paragraphEl, stylesheet));
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
