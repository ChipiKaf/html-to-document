import { createStylesheet } from 'html-to-document-core';
import { describe, expect, it } from 'vitest';
import {
  DOCX_DEFAULT_DECLARATION_ORIGIN,
  DocxStylesheet,
} from '../src/docx-stylesheet';

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
});
