---
id: middleware
title: Middleware
sidebar_label: Middleware
sidebar_position: 5
---

# Middleware

`middleware` is deprecated and kept as a compatibility layer for the newer plugin system.

Middleware functions still run on the HTML string _before_ it is parsed into `DocumentElement` nodes, but internally each middleware entry is adapted into a plugin with a `beforeParse` hook.

Use [Plugins](./plugins) for new code.

## Signature

```ts
import { Middleware } from 'html-to-document';

type Middleware = (html: string) => Promise<string>;
```

See the [Types Reference](./types) for the full definition.

## Default Middleware Behavior

The old built-in whitespace minifier now exists as the default `minify` plugin. `clearMiddleware: true` still disables it by default because it implies `enableDefaultPlugins: false` unless you explicitly override that.

The default behavior is still:

- Strips HTML comments (`<!-- ... -->`)
- Collapses consecutive whitespace into a single space (outside `<pre>`)
- Removes unnecessary whitespace between tags
- Trims leading and trailing whitespace

## Custom Middleware

There are two legacy ways to register middleware:

### 1. Via `init` options

```ts
import { init } from 'html-to-document';

// Example: remove all <script> tags
const stripScripts: Middleware = async (html) =>
  html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/g, '');

const converter = init({
  clearMiddleware: true, // skip default minifier
  middleware: [stripScripts],
});
```

### 2. Programmatically

```ts
const converter = init();
// Add another middleware after initialization
converter.useMiddleware(stripScripts);
```

> **Note:** Middleware functions are executed in the order they are passed in or registered. Make sure to arrange them accordingly if one depends on the output of another.

When both `plugins` and deprecated `middleware` are provided through `init()` or the `Converter` constructor, plugin `beforeParse` hooks run first and adapted middleware runs after them.

## Example: Sanitizing HTML

```ts
import { init } from 'html-to-document';

// Remove all inline styles
const removeStyles: Middleware = async (html) =>
  html.replace(/ style="[^"]*"/g, '');

const converter = init({
  middleware: [removeStyles],
});

converter.convert('<p style="color:red">Hello</p>', 'docx')
  .then(buffer => /* ... */)
  .catch(console.error);
```

## Migration to Plugins

```ts
const converter = init({
  plugins: [
    {
      beforeParse: async (html) => html.replace(/ style="[^"]*"/g, ''),
    },
  ],
});
```
