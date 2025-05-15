---
id: types
title: Types Reference
sidebar_position: 7
---

# Types Reference

| Type                  | Description                                                              |
|-----------------------|--------------------------------------------------------------------------|
| `InitOptions`         | Options for initializing the converter via `init`.                       |
| `ConverterOptions`    | Internal options for the `Converter` constructor.                        |
| `Converter`           | Main class for conversion and parsing (methods: `convert`, `parse`).     |
| `Middleware`          | Async function `(html: string) => Promise<string>`.                     |
| `TagHandler`          | Handler `(element, options?) => DocumentElement \| DocumentElement[]`.   |
| `TagHandlerObject`    | `{ key: string; handler: TagHandler }`.                                  |
| `DocumentElement`     | Union of intermediate document element types (paragraph, heading, etc.). |
| `ElementType`         | String literal type of element kinds (`'paragraph'`, `'heading'`, etc.).|
| `Styles`              | Map of style keys to string/number, with CSS property support.           |
| `IDOMParser`          | Interface for custom DOM parser with `parse(html: string): Document`.    |
| `IDocumentConverter`  | Adapter interface (`convert(elements): Promise<Buffer \| Blob>`).        |
| `AdapterProvider`     | Constructor type `(new(deps) => IDocumentConverter)`.                    |
| `StyleMapping`        | Map of CSS keys to transform functions `(value, el) => unknown`.         |
| `StyleMapper`         | Class for mapping CSS styles to document styles.                         |

For full definitions, refer to the TypeScript source in `src/core/types.ts`.