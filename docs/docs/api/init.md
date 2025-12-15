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
    register: [{ format: 'docx', adapter: DocxAdapter }],
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
- **Default:** `false`

### `styleInheritance?`

Customize how CSS properties flow from parent to child elements. This allows you to override the default inheritance behavior defined in the core engine.

- **Type:** `Partial<Record<keyof CSS.Properties, Partial<StyleMeta>>>`
- **Example:**
  ```ts
  init({
    styleInheritance: {
      // Force 'border' to inherit (standard CSS does not inherit borders, but you might want to)
      border: {
        inherits: true,
        scopes: ['block', 'tableCell'],
      },
      // Prevent 'color' from inheriting (just as an example)
      color: {
        inherits: false,
        scopes: ['block'],
      },
    },
  });
  ```

#### Understanding Scopes and Cascading

- **`scopes`**: Defines which element types can **have** this property.
  - It answers: _"Is this property allowed on this type of element?"_
  - It does **not** control inheritance (that's `inherits`). IF a child attempts to inherit a property, it must also be valid for that child's scope (unless `cascadeTo` overrides this).
  - _Example_: `textAlign` has `scopes: ['block', 'tableCell']`. A `<span>` (`inline`) cannot have `textAlign` because it is not a valid scope.

- **`inherits`**: Defines if the property flows down to children naturally.
  - _Example_: `textAlign` has `inherits: true`. A `<p>` (block) can inherit `textAlign` from its parent `<div>` (block).

- **`cascadeTo`**: Usage is rare but powerful. It forces a property to pass from a parent to a specific type of child **even if local logic might otherwise filter it**.
  - _Example_: `textAlign` on a `tableCell` should affect the `block` (paragraph) inside it.
  - _Why?_ A table cell isn't just a box; it sets the alignment context for its contents. `cascadeTo: ['block']` tells the engine: "If I'm on a cell, pass me down to the paragraph inside."

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
  const customHandler: TagHandlerObject = {
    /* ... */
  };
  init({ tags: { tagHandlers: [customHandler] } });
  ```
- **defaultStyles:** Fallback style definitions per HTML tag:
  ```ts
  init({
    tags: {
      defaultStyles: [
        { key: 'p', styles: { marginBottom: 10, lineHeight: 1.5 } },
      ],
    },
  });
  ```
- **defaultAttributes:** Fallback attributes per HTML tag:
  ```ts
  init({
    tags: {
      defaultAttributes: [{ key: 'img', attributes: { width: 600 } }],
    },
  });
  ```

### `adapters?`

```ts
{
  register?: { format: string; adapter: AdapterProvider; config?: object }[];
  defaultStyles?: { format: string; styles: Record<ElementType, Styles> }[];
  styleMappings?: { format: string; handlers: StyleMapping }[];
}
```

Adapters determine how the parsed content is rendered into a final document format. You can register your own adapter (e.g., for Markdown) or extend existing ones like the built-in DOCX adapter.
Controls which adapters are registered and how CSS styles map to document properties.

- **register:** List of custom adapters implementing [`IDocumentConverter`](./types):
  ```ts
  init({
    adapters: {
      register: [{ format: 'md', adapter: MyAdapter }],
    },
  });
  ```
- **defaultStyles:** Fallback styles per element type for each format:
  ```ts
  init({
    adapters: {
      defaultStyles: [
        {
          format: 'docx',
          styles: { paragraph: { color: 'darkblue', fontSize: 24 } },
        },
      ],
    },
  });
  ```
- **styleMappings:** Custom CSS → document property mappings via [`StyleMapping`](./style-mappings):

  ```ts
  init({
    adapters: {
      styleMappings: [
        {
          format: 'docx',
          handlers: { fontWeight: (v) => ({ bold: v === 'bold' }) },
        },
      ],
    },
  });
  ```

- **config:** Optional adapter-specific configuration object for each registered adapter. For example, the built-in `DocxAdapter` supports custom block, inline, and fallthrough converters:

  ```ts
  init({
    adapters: {
      register: [
        {
          format: 'docx',
          adapter: DocxAdapter,
          config: {
            blockConverters: [new MyBlockConverter()],
            inlineConverters: [new MyInlineConverter()],
            fallthroughConverters: [new MyFallthroughConverter()],
          },
        },
      ],
    },
  });
  ```

### `domParser?: IDOMParser`

Use a custom DOM parser implementation.

- **Type:** [`IDOMParser`](./types)
- **Example:**
  ```ts
  class CustomParser implements IDOMParser {
    parse(html: string) {
      /* ... */
    }
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
    defaultStyles: [{ format: 'md', styles: { paragraph: { indent: 20 } } }],
    styleMappings: [
      {
        format: 'md',
        handlers: { fontStyle: (v) => ({ italic: v === 'italic' }) },
      },
    ],
  },
  domParser: new CustomParser(), // custom DOM parser implementation
});

converter
  .convert('<h1>Title</h1><p>Text</p>', 'docx')
  .then((buffer) => console.log('Generated DOCX:', buffer))
  .catch(console.error);
```

## Learn More

- [Building a custom adapter](./converters)
- [Available tag handlers and structure](./tags)
- [DocumentElement schema reference](./types)
