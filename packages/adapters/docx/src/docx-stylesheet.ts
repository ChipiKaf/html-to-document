import {
  HeadingElement,
  ParagraphElement,
  StylesheetStatement,
  Stylesheet,
  Styles,
} from 'html-to-document-core';

export const DOCX_DEFAULT_STYLE_SELECTORS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const;

export const hasStyles = (styles: Styles | undefined): styles is Styles =>
  Boolean(styles && Object.keys(styles).length > 0);

export const createBaseParagraphElement = (): ParagraphElement => {
  return {
    type: 'paragraph',
    attributes: {},
    styles: {},
  };
};

export const createBaseHeadingElement = (
  level: 1 | 2 | 3 | 4 | 5 | 6
): HeadingElement => {
  return {
    type: 'heading',
    text: '',
    level,
    attributes: {},
    styles: {},
    metadata: {
      tagName: `h${level}`,
    },
  };
};

export class DocxStylesheet extends Stylesheet {
  constructor(statements: readonly StylesheetStatement[] = []) {
    super(statements);
  }

  override getComputedStylesBySelector(selector: string): Styles {
    const targets = this.splitSelectorList(selector)
      .map((entry) => this.toTargetFromSelector(entry))
      .filter(
        (target): target is NonNullable<typeof target> => target !== undefined
      );

    return this.mergeResolvedStyles(this.resolveMatchingRules(targets));
  }

  protected createDerivedStylesheet(
    statements: readonly StylesheetStatement[]
  ) {
    return new DocxStylesheet(statements);
  }

  protected override shouldExcludeDeclarations(
    rule: ReturnType<Stylesheet['resolveMatchingRules']>[number]
  ): boolean {
    // TODO: make it a bit smarter, so it also matches rules such as `h1, h2`
    return DOCX_DEFAULT_STYLE_SELECTORS.includes(
      rule.selector as (typeof DOCX_DEFAULT_STYLE_SELECTORS)[number]
    );
  }
}
