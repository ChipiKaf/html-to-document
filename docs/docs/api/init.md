---
id: init
title: Initialization
sidebar_label: Initialization
sidebar_position: 2
---

# Initialization

The `init` function is your main entry point to configure and initialize the converter engine. It returns a `Converter` instance that can parse HTML and convert it into document formats like DOCX, PDF, or Markdown. Through `init`, you can register custom adapters, tag handlers, middleware, and default styles to control how HTML is interpreted and styled.

## Quick Start

Here's a minimal example to get started:

```ts
import { init, DocxAdapter } from 'html-to-document';

const converter = init({
  adapters: {
    register: [
      { format: 'docx', adapter: DocxAdapter },
    ],
  },
});


const html = '<h1>Hello</h1><p>This is a paragraph</p>';

converter.convert(html, 'docx').then((blobOrBuffer) => {
  // Save or download the result
  console.log('Document generated');
});
```

For full customization, refer to the options below.

## Signature

```ts
import { init } from 'html-to-document';

declare function init(options?: InitOptions): Converter;
```

The `options` object conforms to the [`InitOptions`](./types) type and supports the following properties:

### `middleware?: Middleware[]`
Register one or more middleware functions to transform the HTML before parsing.
Middleware lets you transform or sanitize HTML before parsing—e.g., stripping scripts, normalizing whitespace, or injecting metadata.
- **Type:** [`Middleware`](./types)[]
- **Default:** _[minifyMiddleware] applied automatically unless `clearMiddleware` is `true`_
- **Example:**
  ```ts
  import { init } from 'html-to-document';
  import { customMiddleware1, customMiddleware2 } from './middleware';

  const converter = init({
    middleware: [customMiddleware1, customMiddleware2],
  });
  ```

### `clearMiddleware?: boolean`
Skips registering the default `minifyMiddleware`. When `true`, only your provided middleware functions will be used.
- **Type:** boolean
- **Default:** `false`

### `tags?`

```ts
{
  tagHandlers?: TagHandlerObject[];
  defaultStyles?: { key: string; styles: Styles }[];
  defaultAttributes?: { key: string; attributes: Record<string, any> }[];
}
```
Customize how HTML tags are parsed and styled before conversion.
- **tagHandlers:** Provide custom [`TagHandlerObject`](./types) overrides:
  ```ts
  const customHandler: TagHandlerObject = { /* ... */ };
  init({ tags: { tagHandlers: [customHandler] } });
  ```
- **defaultStyles:** Fallback style definitions per HTML tag:
  ```ts
  init({ tags: {
    defaultStyles: [
      { key: 'p', styles: { marginBottom: 10, lineHeight: 1.5 } },
    ],
  } });
  ```
- **defaultAttributes:** Fallback attributes per HTML tag:
  ```ts
  init({ tags: {
    defaultAttributes: [
      { key: 'img', attributes: { width: 600 } },
    ],
  } });
  ```

### `adapters?`

```ts
{
  register?: { format: string; adapter: AdapterProvider }[];
  defaultStyles?: { format: string; styles: Record<ElementType, Styles> }[];
  styleMappings?: { format: string; handlers: StyleMapping }[];
}
```
Adapters determine how the parsed content is rendered into a final document format. You can register your own adapter (e.g., for Markdown) or extend existing ones like the built-in DOCX adapter.
Controls which adapters are registered and how CSS styles map to document properties.
- **register:** List of custom adapters implementing [`IDocumentConverter`](./types):
  ```ts
  init({ adapters: {
    register: [
      { format: 'md', adapter: MyAdapter },
    ],
  } });
  ```
- **defaultStyles:** Fallback styles per element type for each format:
  ```ts
  init({ adapters: {
    defaultStyles: [
      { format: 'docx', styles: { paragraph: { color: 'darkblue', fontSize: 24 } } },
    ],
  } });
  ```
- **styleMappings:** Custom CSS → document property mappings via [`StyleMapping`](./style-mappings):
  ```ts
  init({ adapters: {
    styleMappings: [
      { format: 'docx', handlers: { fontWeight: (v) => ({ bold: v === 'bold' }) } },
    ],
  } });
  ```

### `domParser?: IDOMParser`
Use a custom DOM parser implementation.
- **Type:** [`IDOMParser`](./types)
- **Example:**
  ```ts
  class CustomParser implements IDOMParser {
    parse(html: string) { /* ... */ }
  }
  init({ domParser: new CustomParser() });
  ```

## Example Usage

```ts
import { init } from 'html-to-document';
import { MyAdapter } from './my-adapter';
import { customMiddleware } from './middleware';
import { CustomParser } from './parser';

const converter = init({
  clearMiddleware: false,
  middleware: [customMiddleware],
  tags: {
    defaultStyles: [{ key: 'p', styles: { marginBottom: 8 } }],
  },
  adapters: {
    register: [{ format: 'md', adapter: MyAdapter }],
    defaultStyles: [
      { format: 'md', styles: { paragraph: { indent: 20 } } },
    ],
    styleMappings: [
      { format: 'md', handlers: { fontStyle: (v) => ({ italic: v === 'italic' }) } },
    ],
  },
  domParser: new CustomParser(), // custom DOM parser implementation
});

converter.convert('<h1>Title</h1><p>Text</p>', 'docx')
  .then((buffer) => console.log('Generated DOCX:', buffer))
  .catch(console.error);
```

## Learn More

- [Building a custom adapter](./converters)
- [Available tag handlers and structure](./tags)
- [DocumentElement schema reference](./types)