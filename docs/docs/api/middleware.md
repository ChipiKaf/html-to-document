---
id: middleware
title: Middleware
sidebar_label: Middleware
sidebar_position: 4
---

# Middleware

Middleware functions run on the HTML string _before_ it is parsed into `DocumentElement` nodes. They allow you to transform, sanitize, or minify the HTML content.

## Signature

```ts
import { Middleware } from 'html-to-document';

type Middleware = (html: string) => Promise<string>;
```

See the [Types Reference](./types) for the full definition.

## Default Middleware

By default, `init()` applies a built-in whitespace-minifying middleware (unless you set `clearMiddleware: true`). This default middleware:
- Strips HTML comments (`<!-- ... -->`)
- Collapses consecutive whitespace into a single space (outside `<pre>`)
- Removes unnecessary whitespace between tags
- Trims leading and trailing whitespace

## Custom Middleware

There are two ways to register your own middleware:

### 1. Via `init` options

```ts
import { init } from 'html-to-document';

// Example: remove all <script> tags
const stripScripts: Middleware = async (html) =>
  html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/g, '');

const converter = init({
  clearMiddleware: true,    // skip default minifier
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