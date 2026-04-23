---
id: plugins
title: Plugins
sidebar_label: Plugins
sidebar_position: 4
---

# Plugins

Plugins are the primary extension mechanism for `html-to-document`.

They can participate in three independent stages:

- `transformHtml(html)` — modify HTML before parsing
- `transformDocument(elements)` — modify parsed `DocumentElement[]` before conversion
- stylesheet hooks used only when you explicitly call `createStylesheet(..., { plugins })`

## Signature

```ts
import type {
  Plugin,
  IStylesheet,
  IStylesheetDecorator,
  IMatchElementDecorator,
} from 'html-to-document';

const plugin: Plugin = {
  name: 'example',
  transformHtml: (html) => html,
  transformDocument: (elements) => elements,
  setupStylesheet: (sheet: IStylesheet) => {
    sheet.addStyleRule('.accent', { color: 'purple' });
  },
  createStylesheetDecorator: () => ({
    decorate(target) {
      return target;
    },
  }),
  createMatchElementDecorator: (): IMatchElementDecorator => ({
    decorateMatchElement(next) {
      return (element, selector) => next(element, selector);
    },
  }),
};
```

## Example: HTML and document transforms

```ts
import { init } from 'html-to-document';

const converter = init({
  plugins: [
    {
      name: 'sanitize-and-tag',
      transformHtml: (html) =>
        html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/g, ''),
      transformDocument: (elements) =>
        elements.map((element) =>
          element.type === 'paragraph'
            ? {
                ...element,
                metadata: {
                  ...(element.metadata ?? {}),
                  fromPlugin: true,
                },
              }
            : element
        ),
    },
  ],
});
```

## Example: Stylesheet hooks

```ts
import { createStylesheet } from 'html-to-document';

const sheet = createStylesheet([], {
  plugins: [
    {
      name: 'defaults',
      setupStylesheet: (target) => {
        target.addStyleRule('.accent', { color: 'purple' });
      },
    },
  ],
});
```

## Middleware migration

`middleware` and `clearMiddleware` still work, but they are deprecated.

```ts
// old
init({
  middleware: [async (html) => html.replace('foo', 'bar')],
});

// new
init({
  plugins: [
    {
      name: 'replace-foo',
      transformHtml: (html) => html.replace('foo', 'bar'),
    },
  ],
});
```
