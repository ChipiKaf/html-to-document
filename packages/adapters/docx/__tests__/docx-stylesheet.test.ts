import { createStylesheet } from 'html-to-document-core';
import type {
  CompiledStyleRule,
  StylesheetStatement,
} from '../../../core/src/styles/interfaces';
import { describe, expect, it } from 'vitest';
import {
  DOCX_DEFAULT_DECLARATION_ORIGIN,
  DocxStylesheet,
} from '../src/docx-stylesheet';

class ExtendedDocxStylesheet extends DocxStylesheet {
  constructor(statements: readonly StylesheetStatement[] = []) {
    super(statements, ExtendedDocxStylesheet);
  }

  protected override shouldExcludeDeclarations(
    rule: CompiledStyleRule
  ): boolean {
    return (
      super.shouldExcludeDeclarations(rule) || rule.selector === '.exclude-me'
    );
  }
}

describe('DocxStylesheet', () => {
  it('excludes docx default declarations from matched styles', () => {
    const stylesheet = new DocxStylesheet([
      ...createStylesheet([
        {
          kind: 'style',
          selectors: ['h1'],
          declarations: { color: 'blue' },
          declarationMeta: { origin: DOCX_DEFAULT_DECLARATION_ORIGIN },
        },
      ]).getStatements(),
    ]);

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 1,
        metadata: { tagName: 'h1' },
      })
    ).toEqual({});
  });

  it('does not exclude non-docx-default selectors even when tagged with the docx origin', () => {
    const stylesheet = new DocxStylesheet([
      ...createStylesheet([
        {
          kind: 'style',
          selectors: ['.cool-heading'],
          declarations: { color: 'blue' },
          declarationMeta: { origin: DOCX_DEFAULT_DECLARATION_ORIGIN },
        },
      ]).getStatements(),
    ]);

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 1,
        attributes: { class: 'cool-heading' },
        metadata: { tagName: 'h1' },
      })
    ).toEqual({ color: 'blue' });
  });

  it('can be extended and preserve shouldExcludeDeclarations overrides in derived stylesheets', () => {
    const stylesheet = new ExtendedDocxStylesheet([
      ...createStylesheet([
        {
          kind: 'style',
          selectors: ['h1'],
          declarations: { color: 'blue' },
          declarationMeta: { origin: DOCX_DEFAULT_DECLARATION_ORIGIN },
        },
        {
          kind: 'style',
          selectors: ['.exclude-me'],
          declarations: { fontWeight: 'bold' },
        },
        {
          kind: 'style',
          selectors: ['.keep-me'],
          declarations: { color: 'green' },
        },
      ]).getStatements(),
    ]);

    const derived = stylesheet.subtractStylesBySelector('.missing-selector');

    expect(derived).toBeInstanceOf(ExtendedDocxStylesheet);
    expect(
      derived.getMatchedStyles({
        type: 'heading',
        level: 1,
        attributes: { class: 'exclude-me' },
        metadata: { tagName: 'h1' },
      })
    ).toEqual({});
    expect(
      derived.getMatchedStyles({
        type: 'heading',
        level: 1,
        attributes: { class: 'keep-me' },
        metadata: { tagName: 'h1' },
      })
    ).toEqual({ color: 'green' });
  });
});
