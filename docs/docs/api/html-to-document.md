---
id: html-to-document
title: Overview
sidebar_label: Overview
sidebar_position: 1
---

# HTML to Document API Overview

This is the core **html-to-document** library for converting HTML content into professional documents (e.g., DOCX, PDF).

## Installation

```bash
npm install html-to-document
```

## Import

```ts
import { init, Converter } from 'html-to-document';
```

## Quick Start

```ts
import { init, DocxAdapter } from 'html-to-document';

const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
  // Other configuration
});

// Convert HTML string to DOCX buffer
converter
  .convert('<h1>Hello World</h1><p>This is a paragraph.</p>', 'docx')
  .then((buffer) => {
    // handle Buffer in Node.js or Blob in browsers
  })
  .catch(console.error);
```

## API

### [`init`](./init)(options?: [`InitOptions`](./types)): [`Converter`](./types)

Initialize a new [`Converter`](./types) instance.

- **options**: [`InitOptions`](./types) (optional)
- `plugins?: [`Plugin`](./types)[]` – plugin hooks for HTML preprocessing, document inspection, and post-parse element replacement.
  - `enableDefaultPlugins?: boolean` – enable or disable built-in plugins.
  - `middleware?: [`Middleware`](./types)[]` – deprecated middleware compatibility layer.
  - `tags?: { tagHandlers?: [`TagHandlerObject`](./types)[]; defaultStyles?: ...; defaultAttributes?: ... }` – custom tag handlers and default tag options.
- `adapters?: { defaultStyles?: ...; register?: { format: string; adapter: [`AdapterProvider`](./types); config?: object; createAdapter?: ... }[] }` – register adapters, customize construction per adapter, and pass adapter-specific config.
  - `clearMiddleware?: boolean` – deprecated legacy switch that disables default plugins by implication.
  - `domParser?: [`IDOMParser`](./types)` – custom DOM parser implementation.

Returns: a configured [`Converter`](./types) instance.

### Advanced Topics

Explore further customization using the links below:

- [Initialization](./init)
- [Plugins](./plugins)
- [Custom Tag Handlers](./tags)
- [Middleware](./middleware)
- [Style Mappings & Default Styles](./style-mappings)
- [Stylesheet API](./stylesheet)
- [Custom Converters](./converters)
- [Types Reference](./types)

### Converter

Class for parsing and converting HTML to document formats.

#### new Converter(options: [`ConverterOptions`](./types))

Create a Converter with raw options:

- `tags?: ...` – alias for `options.tags` in `init`.
- `plugins?: [`Plugin`](./types)[]`
- `enableDefaultPlugins?: boolean`
- `middleware?: [`Middleware`](./types)[]` (deprecated)
- `clearMiddleware?: boolean` (deprecated)
- `adapters?: ...`
- `registerAdapters?: { format: string; adapter: [`IDocumentConverter`](./types) }[]`
- `domParser?: [`IDOMParser`](./types)`

#### Methods

##### `convert(content: string | [DocumentElement](./types)[], format: string): Promise<Buffer | Blob>`

Convert HTML string or pre-parsed [`DocumentElement`](./types)[] to a `Buffer` (Node.js) or `Blob` (browser).

- `content`: raw HTML or array of [`DocumentElement`](./types).
- `format`: target format key (e.g., `'docx'`, `'pdf'`, etc.).

Returns: `Promise<Buffer | Blob>`

##### `parse(html: string): Promise<[DocumentElement](./types)[]>`

Parse raw HTML into an intermediate representation.

- `html`: HTML string.

Returns: `Promise<[DocumentElement](./types)[]>`

##### useMiddleware(mw: [`Middleware`](./types)): void

Register a middleware function to process HTML before parsing.

- `mw`: [`Middleware`](./types) function.

##### usePlugin(plugin: [`Plugin`](./types)): void

Register a plugin after construction.

- `plugin`: [`Plugin`](./types) object with `beforeParse`, `onDocument`, and/or `afterParse` hooks.

##### registerConverter(name: string, converter: [`IDocumentConverter`](./types)): void

Register a custom document converter adapter.

- `name`: format key.
- `converter`: instance of [`IDocumentConverter`](./types).

## Types

| Type                            | Description                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`InitOptions`](./types)        | Options for initializing the converter via `init`.                                                                                          |
| [`ConverterOptions`](./types)   | Internal options for the `Converter` constructor.                                                                                           |
| [`Converter`](./types)          | Main class for conversion and parsing.                                                                                                      |
| [`Plugin`](./types)             | Optional `beforeParse` and `afterParse` hooks for extending the conversion pipeline.                                                        |
| [`Middleware`](./types)         | Asynchronous function taking an HTML string and returning a Promise of string.                                                              |
| [`TagHandler`](./types)         | Handler that processes an `HTMLElement` with optional `TagHandlerOptions` and returns a `DocumentElement` or an array of `DocumentElement`. |
| [`TagHandlerObject`](./types)   | `{ key: string; handler: TagHandler }`                                                                                                      |
| [`DocumentElement`](./types)    | Union type for intermediate document elements (paragraph, heading, etc.).                                                                   |
| [`ElementType`](./types)        | String literal type of element kinds (`'paragraph'`, `'heading'`, etc.).                                                                    |
| [`Styles`](./types)             | Map of style properties to values (string or number), with support for CSS properties.                                                      |
| [`IDOMParser`](./types)         | Interface for custom DOM parser with `parse(html: string): Document`.                                                                       |
| [`IDocumentConverter`](./types) | Interface for adapter converters. Method `convert(elements: DocumentElement[])` returns a Promise resolving to a `Buffer` or `Blob`.        |
| [`AdapterProvider`](./types)    | Constructor type for adapters (`new(deps: IConverterDependencies) => IDocumentConverter`).                                                  |

For more details, refer to the [source code](https://github.com/ChipiKaf/html-to-document).
