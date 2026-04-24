import { describe, expect, it } from 'vitest';
import { Stylesheet } from '../src/styles/sheet';

describe('stylesheet', () => {
  it('resolves matching style rules by specificity and source order', () => {
    const sheet = new Stylesheet();

    sheet.addStyleRule('h1', { color: 'blue', fontWeight: 'normal' });
    sheet.addStyleRule('.title', { fontWeight: 'bold' });
    sheet.addStyleRule('h1.title', { color: 'red' });
    sheet.addStyleRule('h1.title', { color: 'green' });

    expect(sheet.getComputedStylesBySelector('h1.title')).toEqual({
      color: 'green',
      fontWeight: 'bold',
    });
  });

  it('splits grouped selectors and computes styles for document elements', () => {
    const sheet = new Stylesheet();

    sheet.addStyleRule('h1, h2', { fontWeight: 'bold' });
    sheet.addRule('.hero', { color: 'purple' });

    const styles = sheet.getComputedStyles({
      type: 'heading',
      level: 1,
      attributes: { class: 'hero' },
      styles: { marginBottom: '12px' },
      metadata: {
        tagName: 'h1',
      },
    });

    expect(styles).toEqual({
      fontWeight: 'bold',
      color: 'purple',
      marginBottom: '12px',
    });
  });

  it('stores top-level at-rules separately from style resolution', () => {
    const sheet = new Stylesheet();

    sheet.addStyleRule('p', { color: 'black' });
    sheet.addAtRule({
      kind: 'at-rule',
      name: 'page',
      descriptors: {
        size: 'A4',
        margin: '1in',
      },
    });

    expect(sheet.getComputedStylesBySelector('p')).toEqual({ color: 'black' });
    expect(sheet.getAtRules('page')).toEqual([
      {
        kind: 'at-rule',
        name: 'page',
        descriptors: {
          size: 'A4',
          margin: '1in',
        },
        prelude: undefined,
        children: undefined,
      },
    ]);
  });

  it('returns at-rules in insertion order and supports filtering by name', () => {
    const sheet = new Stylesheet();

    sheet.addAtRule({
      kind: 'at-rule',
      name: 'page',
      prelude: ':first',
      descriptors: { marginTop: '2in' },
    });
    sheet.addAtRule({
      kind: 'at-rule',
      name: 'media',
      prelude: 'print',
      children: [
        {
          kind: 'style',
          selectors: ['h1'],
          declarations: { color: 'black' },
        },
      ],
    });
    sheet.addAtRule({
      kind: 'at-rule',
      name: 'page',
      descriptors: { size: 'A4' },
    });

    expect(sheet.getAtRules().map((rule) => rule.name)).toEqual([
      'page',
      'media',
      'page',
    ]);
    expect(sheet.getAtRules('page')).toEqual([
      {
        kind: 'at-rule',
        name: 'page',
        prelude: ':first',
        descriptors: { marginTop: '2in' },
        children: undefined,
      },
      {
        kind: 'at-rule',
        name: 'page',
        prelude: undefined,
        descriptors: { size: 'A4' },
        children: undefined,
      },
    ]);
  });

  it('preserves nested at-rule children but only returns top-level matches', () => {
    const sheet = new Stylesheet([
      {
        kind: 'at-rule',
        name: 'media',
        prelude: 'print',
        children: [
          {
            kind: 'at-rule',
            name: 'page',
            descriptors: { size: 'Letter' },
          },
        ],
      },
      {
        kind: 'at-rule',
        name: 'page',
        descriptors: { size: 'A4' },
      },
    ]);

    expect(sheet.getAtRules('page')).toEqual([
      {
        kind: 'at-rule',
        name: 'page',
        prelude: undefined,
        descriptors: { size: 'A4' },
        children: undefined,
      },
    ]);

    expect(sheet.getAtRules('media')).toEqual([
      {
        kind: 'at-rule',
        name: 'media',
        prelude: 'print',
        descriptors: undefined,
        children: [
          {
            kind: 'at-rule',
            name: 'page',
            prelude: undefined,
            descriptors: { size: 'Letter' },
            children: undefined,
          },
        ],
      },
    ]);
  });

  it('returns defensive copies for at-rules and statements', () => {
    const sheet = new Stylesheet();

    sheet.addAtRule({
      kind: 'at-rule',
      name: 'page',
      descriptors: { size: 'A4' },
      children: [
        {
          kind: 'style',
          selectors: ['p'],
          declarations: { color: 'black' },
          children: [
            {
              kind: 'at-rule',
              name: 'supports',
              prelude: '(color: red)',
            },
          ],
        },
      ],
    });

    const [firstAtRule] = sheet.getAtRules('page');
    const [firstStatement] = sheet.getStatements();

    if (
      !firstAtRule ||
      !firstAtRule.descriptors ||
      !firstStatement ||
      firstStatement.kind !== 'at-rule' ||
      !firstStatement.children ||
      firstStatement.children[0]?.kind !== 'style' ||
      !firstStatement.children[0].children
    ) {
      throw new Error('expected stylesheet contents to exist');
    }

    (firstAtRule.descriptors as Record<string, string | number>).size = 'Legal';
    firstStatement.children[0].declarations.color = 'red';
    firstStatement.children[0].children[0]!.prelude = '(color: blue)';

    expect(sheet.getAtRules('page')).toEqual([
      {
        kind: 'at-rule',
        name: 'page',
        prelude: undefined,
        descriptors: { size: 'A4' },
        children: [
          {
            kind: 'style',
            selectors: ['p'],
            declarations: { color: 'black' },
            children: [
              {
                kind: 'at-rule',
                name: 'supports',
                prelude: '(color: red)',
                descriptors: undefined,
                children: undefined,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('preserves at-rules nested directly inside style rules', () => {
    const sheet = new Stylesheet([
      {
        kind: 'style',
        selectors: ['p.note'],
        declarations: { color: 'purple' },
        children: [
          {
            kind: 'at-rule',
            name: 'container',
            prelude: 'card (min-width: 20rem)',
            children: [
              {
                kind: 'style',
                selectors: ['&'],
                declarations: { color: 'blue' },
              },
            ],
          },
        ],
      },
    ]);

    expect(sheet.getComputedStylesBySelector('p.note')).toEqual({
      color: 'purple',
    });
    expect(sheet.getStatements()).toEqual([
      {
        kind: 'style',
        selectors: ['p.note'],
        declarations: { color: 'purple' },
        children: [
          {
            kind: 'at-rule',
            name: 'container',
            prelude: 'card (min-width: 20rem)',
            descriptors: undefined,
            children: [
              {
                kind: 'style',
                selectors: ['&'],
                declarations: { color: 'blue' },
                children: undefined,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('matches simple attribute selectors', () => {
    const sheet = new Stylesheet();

    sheet.addStyleRule('[data-variant="primary"]', { color: 'white' });
    sheet.addStyleRule('[data-variant^="pri"]', { backgroundColor: 'blue' });

    const styles = sheet.getComputedStyles({
      type: 'paragraph',
      attributes: { 'data-variant': 'primary' },
    });

    expect(styles).toEqual({
      color: 'white',
      backgroundColor: 'blue',
    });
  });
});
