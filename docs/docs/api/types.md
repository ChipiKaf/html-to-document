---
id: types
title: Types Reference
sidebar_position: 7
---

# Types Reference

| Type                 | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `InitOptions`        | Options for initializing the converter via `init`.                       |
| `ConverterOptions`   | Internal options for the `Converter` constructor.                        |
| `Converter`          | Main class for conversion and parsing (methods: `convert`, `parse`).     |
| `Middleware`         | Async function `(html: string) => Promise<string>`.                      |
| `TagHandler`         | Handler `(element, options?) => DocumentElement \| DocumentElement[]`.   |
| `TagHandlerObject`   | `{ key: string; handler: TagHandler }`.                                  |
| `DocumentElement`    | Union of intermediate document element types (paragraph, heading, etc.). |
| `ElementType`        | String literal type of element kinds (`'paragraph'`, `'heading'`, etc.). |
| `Styles`             | Map of style keys to string/number, with CSS property support.           |
| `IDOMParser`         | Interface for custom DOM parser with `parse(html: string): Document`.    |
| `IDocumentConverter` | Adapter interface (`convert(elements): Promise<Buffer \| Blob>`).        |
| `AdapterProvider`    | Constructor type `(new(deps) => IDocumentConverter)`.                    |
| `IStylesheet`        | Rule-based stylesheet interface passed to adapters.                      |
| `StyleRule`          | A selector rule with declarations.                                       |
| `AtRule`             | A top-level or nested at-rule statement like `@page`.                    |

DOCX-specific mapping helpers such as `DocxStyleMapping` and `DocxStyleMapper` now live in `html-to-document-adapter-docx`, not in core.

For the stylesheet model and helpers, see [Stylesheet API](./stylesheet).

For full definitions, refer to the TypeScript source in `src/core/types.ts`.

## Document Elements

All built-in document element interfaces extend the `BaseElement` type. Below are the default element types you'll encounter when parsing HTML:

### Paragraph (`paragraph`)

_Interface:_ `ParagraphElement` (`type: 'paragraph'`)  
Represents a block of text or grouping of inline content. Commonly produced from HTML `<p>`, `<pre>`, `<blockquote>`, `<figure>`, and `<figcaption>`.  
**Key properties**:

- `text?: string` — Plain text content.
- `content?: DocumentElement[]` — Nested child elements (inline text, images).
- `styles?`, `attributes?`, `metadata?`.

### Heading (`heading`)

_Interface:_ `HeadingElement` (`type: 'heading'`)  
Represents section titles. Produced from HTML `<h1>`–`<h6>`.  
**Key properties**:

- `text: string` — Heading text.
- `level: number` — Heading level (1–6).
- `content?: DocumentElement[]`.
- `styles?`, `attributes?`, `metadata?`.

### Image (`image`)

_Interface:_ `ImageElement` (`type: 'image'`)  
Represents an image resource. Produced from `<img>` tags.  
**Key properties**:

- `src: string` — Image URL or data URI.
- `styles?`, `attributes?`, `metadata?`.

### Text (`text`)

_Interface:_ `TextElement` (`type: 'text'`)  
The basic inline text node. Produced for text content and many inline tags (`<span>`, `<strong>`, `<em>`, etc.).  
**Key properties**:

- `text: string` — Text content.
- `content?: DocumentElement[]` — Nested formatting elements.
- `styles?`, `attributes?`, `metadata?`.

### Line (`line`)

_Interface:_ `LineElement` (`type: 'line'`)  
A horizontal divider or rule. Produced from `<hr>` elements.  
**Key properties**:

- `styles?`, `attributes?`, `metadata?`.

### List (`list`)

_Interface:_ `ListElement` (`type: 'list'`)  
An ordered or unordered list container. Produced from `<ol>` and `<ul>`.  
**Key properties**:

- `listType: 'ordered' | 'unordered'` — List style.
- `level: number` — Nesting level.
- `content: ListItemElement[]` — List items.
- `markerStyle?: string` — Custom bullet or marker style.
- `text?`, `styles?`, `attributes?`, `metadata?`.

### List Item (`list-item`)

_Interface:_ `ListItemElement` (`type: 'list-item'`)  
A single item within a list. Produced from `<li>`.  
**Key properties**:

- `text?: string` — Inline text content.
- `level: number` — Nesting level.
- `content: DocumentElement[]` — Item content (paragraphs, nested lists).
- `styles?`, `attributes?`, `metadata?`.

### Table (`table`)

_Interface:_ `TableElement` (`type: 'table'`)  
Represents a table container. Produced from `<table>`.  
**Key properties**:

- `rows: TableRowElement[]` — Table rows.
- `content?: DocumentElement[]` — Non-row content (e.g., captions).
- `styles?`, `attributes?`, `metadata?`.

### Table Row (`table-row`)

_Interface:_ `TableRowElement` (`type: 'table-row'`)  
A row within a table. Produced from `<tr>`.  
**Key properties**:

- `cells: TableCellElement[]` — Cells in the row.
- `styles?`, `attributes?`, `metadata?`.

### Table Cell (`table-cell`)

_Interface:_ `TableCellElement` (`type: 'table-cell'`)  
A cell within a table row. Produced from `<td>` and `<th>`.  
**Key properties**:

- `colspan?: number` — Number of columns to span.
- `rowspan?: number` — Number of rows to span.
- `content?: DocumentElement[]` — Cell content.
- `styles?`, `attributes?`, `metadata?`.

### Fragment (`fragment`)

_Interface:_ `FragmentElement` (`type: 'fragment'`)  
A generic grouping container without specific semantics. Produced from `<div>` or `<dl>`.  
**Key properties**:

- `text?`, `content?: DocumentElement[]`, `styles?`, `attributes?`, `metadata?`.

### Attribute (`attribute`)

_Interface:_ `AttributeElement` (`type: 'attribute'`)  
An attribute-like element for table metadata (e.g., column definitions via `<colgroup>`, `<col>`, or captions). Captures structural attributes.  
**Key properties**:

- `name?: string` — Name of the attribute (e.g., `'colgroup'`, `'col'`, `'caption'`).
- `attributes?: Record<string, string \| number>` — Attribute key/value pairs.
- `text?`, `content?: DocumentElement[]`, `styles?`, `metadata?`.

---

### Custom Element Types

You are not limited to the built-in element types. The `ElementType` union includes `(string & {})`, so you can define custom types simply by returning a `DocumentElement` with a `type` set to your custom string.

For example, you can handle a `<widget>` tag and produce a custom `widget` element:

```ts
import { init, TagHandlerObject, DocumentElement } from 'html-to-document';

const widgetHandler: TagHandlerObject = {
  key: 'widget',
  handler: (element, options) => {
    const id = element.getAttribute('data-id');
    return {
      type: 'widget',
      metadata: { id },
      content: options.content,
      styles: options.styles,
      attributes: options.attributes,
    } as DocumentElement;
  },
};

const converter = init({
  tags: {
    tagHandlers: [widgetHandler],
  },
});
```

This will produce `DocumentElement` nodes with `type: 'widget'`, which you can process in your custom adapter or middleware.
