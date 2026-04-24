---
id: stylesheet
title: Stylesheet API
sidebar_position: 6
---

# Stylesheet API

The stylesheet system lets `html-to-document` keep style rules outside of parsed `DocumentElement.styles` and resolve them later during serialization or adapter conversion.

This is especially useful for:

- HTML tag defaults that should behave like rules, not inline styles
- document-level rules passed into `init()`
- adapter-specific default styles
- adapters that need to inspect top-level at-rules such as `@page`

## The two style sources

There are now two different places styles can come from:

### 1. Inline element styles

These are styles parsed from the HTML itself, such as:

```html
<p style="color: red; font-weight: bold">Hello</p>
```

Those values still end up on `element.styles`.

### 2. Stylesheet rules

These are rules stored in an `IStylesheet` instance.

They come from:

- built-in seeded rules like heading defaults
- `tags.defaultStyles`
- `stylesheetRules` passed to `init()`
- adapter `defaultStyles`
- a custom `stylesheet` passed to `init()`

These rules are matched later by adapters using selectors.

## Using `stylesheetRules` in `init()`

The main API for supplying rules directly is `stylesheetRules`.

```ts
import { init, DocxAdapter } from 'html-to-document';

const converter = init({
  stylesheetRules: [
    {
      kind: 'style',
      selectors: ['p.note', 'div.note'],
      declarations: {
        color: 'rebeccapurple',
        fontWeight: 'bold',
      },
    },
    {
      kind: 'at-rule',
      name: 'page',
      descriptors: {
        size: 'A4',
        margin: '1in',
      },
    },
  ],
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
});
```

`stylesheetRules` is the easiest way to seed rule statements without manually creating a stylesheet instance first.

## Using a custom `stylesheet`

If you need full control, you can provide your own stylesheet implementation or a prebuilt stylesheet instance.

```ts
import { init, createStylesheet } from 'html-to-document';

const stylesheet = createStylesheet();
stylesheet.addStyleRule('p.note', { color: 'green' });
stylesheet.addAtRule({
  kind: 'at-rule',
  name: 'page',
  descriptors: { size: 'A4' },
});

const converter = init({
  stylesheet,
});
```

When you pass `stylesheet`, the library still appends other seeded rules onto it.

## What `init()` seeds into the stylesheet

When you call `init()`, the base stylesheet is built in this order:

1. built-in base rules from `createBaseStylesheet()`
2. rules generated from `tags.defaultStyles`
3. rules from `stylesheetRules`
4. for each adapter, format-specific `adapters.defaultStyles`

Each adapter gets its own cloned stylesheet instance, so adapters do not share mutable rule state.

## `tags.defaultStyles` now become stylesheet rules

`tags.defaultStyles` no longer gets merged into parsed `element.styles`.

Instead, each tag default is converted into a selector rule using the tag name itself.

```ts
const converter = init({
  tags: {
    defaultStyles: [
      { key: 'p', styles: { marginBottom: '8px' } },
      { key: 'table', styles: { borderStyle: 'solid' } },
    ],
  },
});
```

That behaves like this conceptually:

```ts
[
  {
    kind: 'style',
    selectors: ['p'],
    declarations: { marginBottom: '8px' },
  },
  {
    kind: 'style',
    selectors: ['table'],
    declarations: { borderStyle: 'solid' },
  },
]
```

This means tag defaults remain selector-driven and can be resolved consistently by adapters.

## `adapters.defaultStyles` also become stylesheet rules

Adapter default styles are still keyed by document element type:

```ts
const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
    defaultStyles: [
      {
        format: 'docx',
        styles: {
          paragraph: { color: 'darkblue' },
          heading: { fontFamily: 'Aptos Display' },
        },
      },
    ],
  },
});
```

These are converted into rules internally and appended to that adapter's stylesheet.

## Rule shapes

A stylesheet stores ordered `StylesheetStatement` values.

### Style rule

```ts
const rule = {
  kind: 'style',
  selectors: ['p', '.note', '#intro'],
  declarations: {
    color: 'red',
    textAlign: 'center',
  },
} as const;
```

### At-rule

```ts
const rule = {
  kind: 'at-rule',
  name: 'page',
  prelude: ':first',
  descriptors: {
    size: 'A4',
    margin: '1in',
  },
} as const;
```

Nested children are also supported for block at-rules.

## Selector support

The matcher currently supports simple selectors:

- tag selectors: `p`
- class selectors: `.note`
- id selectors: `#intro`
- universal selector: `*`
- attribute selectors:
  - `[data-x]`
  - `[data-x="a"]`
  - `[data-x~="a"]`
  - `[lang|="en"]`
  - `[data-x^="pre"]`
  - `[data-x$="end"]`
  - `[data-x*="mid"]`
- selector lists: `h1, h2, h3`

Complex selector relationships like descendant, child, sibling, and pseudo selectors are not currently matched.

## How adapters use the stylesheet

Adapters receive a `stylesheet` in `IConverterDependencies`.

```ts
class MyAdapter {
  constructor(dependencies) {
    console.log(dependencies.stylesheet);
  }
}
```

Useful methods:

### `stylesheet.getMatchedStyles(element)`

Returns only styles resolved from matching rules.

```ts
const matched = stylesheet.getMatchedStyles(element);
```

### `stylesheet.getComputedStyles(element, cascadedStyles)`

Returns merged styles in this order:

```ts
{
  ...cascadedStyles,
  ...stylesheet.getMatchedStyles(element),
  ...(element.styles ?? {}),
}
```

So inline styles on the parsed element still win over stylesheet matches.

### `stylesheet.getStatements()`

Returns all stored top-level statements.

### `stylesheet.getAtRules(name?)`

Lets adapters inspect at-rules like `@page`.

```ts
const pageRules = stylesheet.getAtRules('page');
```

## Built-in seeded rules

`createBaseStylesheet()` currently seeds heading defaults:

- `h1` → `fontSize: '32px'`, `fontWeight: 'bold'`
- `h2` → `fontSize: '24px'`, `fontWeight: 'bold'`
- `h3` to `h6` → `fontWeight: 'bold'`

These are stylesheet rules, not parser-inlined defaults.

## Summary

- use `stylesheetRules` in `init()` to provide rules directly
- use `stylesheet` when you want to provide a custom stylesheet instance
- `tags.defaultStyles` now seed stylesheet rules instead of inlining styles
- `adapters.defaultStyles` are converted into adapter-specific stylesheet rules
- inline HTML styles still live on `element.styles` and override stylesheet matches
