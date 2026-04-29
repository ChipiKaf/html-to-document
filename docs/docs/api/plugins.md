---
id: plugins
title: Plugins
sidebar_label: Plugins
sidebar_position: 4
---

# Plugins

Plugins are the primary extension point for the converter pipeline. They can transform the raw HTML before parsing, inspect or mutate the parsed `Document`, and replace the parsed `DocumentElement[]` after parsing.

## Signature

```ts
import { Plugin } from 'html-to-document';

interface Plugin {
  name?: string;
  beforeParse?(context: BeforeParseContext): void | Promise<void>;
  onDocument?(context: OnDocumentContext): void | Promise<void>;
  afterParse?(context: AfterParseContext): void | Promise<void>;
}
```

`name` is optional and intended for diagnostics.

## Hook Order

Plugins run in registration order.

1. Every `beforeParse` hook runs against the HTML string.
2. The converter parses the final HTML into a `Document` and runs every `onDocument` hook.
3. The parser converts that `Document` into `DocumentElement[]`.
4. Every `afterParse` hook runs against the parsed elements.

Each parse session starts with a fresh stylesheet clone. Every hook receives the same per-parse `stylesheet` and `data` object.

If any plugin throws or rejects, parsing fails immediately and the original error is surfaced.

## Default Plugin

`init()` and `new Converter()` enable a built-in `minify` plugin by default. It:

- strips HTML comments
- collapses consecutive whitespace outside `<pre>`
- removes unnecessary whitespace between tags
- trims leading and trailing whitespace

Use `enableDefaultPlugins: false` to disable it.

## Registering Plugins

### Via `init()`

```ts
import { init } from 'html-to-document';

const converter = init({
  plugins: [
    {
      name: 'strip-scripts',
      beforeParse: async (context) => {
        context.setHtml(
          context.html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/g, '')
        );
      },
    },
    {
      name: 'append-review-flag',
      afterParse: async (context) =>
        context.replaceElements(
          context.elements.map((element) =>
            element.type === 'paragraph' && element.text
              ? {
                  ...element,
                  metadata: { ...element.metadata, reviewed: true },
                }
              : element
          )
        ),
    },
  ],
});
```

## Deprecated Middleware Compatibility

Legacy `middleware` and `clearMiddleware` are still supported for backward compatibility, but they are deprecated in favor of plugins.

- `middleware` entries are internally adapted into plugins with a `beforeParse` hook
- `clearMiddleware: true` implies `enableDefaultPlugins: false` by default
- explicit `enableDefaultPlugins` overrides that implication
- `useMiddleware()` still works and registers a `beforeParse` plugin after construction

This means the following is still valid:

```ts
const converter = init({
  middleware: [async (html) => html.replace('foo', 'bar')],
});
```

But new integrations should prefer:

```ts
const converter = init({
  plugins: [
    {
      beforeParse: async (context) => {
        context.setHtml(context.html.replace('foo', 'bar'));
      },
    },
  ],
});
```
