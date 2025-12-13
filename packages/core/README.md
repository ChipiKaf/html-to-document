# html-to-document-core

**Core engine for converting HTML to document formats.**

This package provides the core parsing and conversion infrastructure. Adapters for specific output formats (e.g., DOCX, PDF) can be plugged in at runtime.

## Installation

```bash
# Install the core engine
npm install html-to-document-core html-to-document-adapter-docx

# Or install the all-in-one wrapper (includes core + default adapters)
npm install html-to-document
```

For full documentation and usage examples, visit:  
https://www.npmjs.com/package/html-to-document

## Usage

```ts
import { init, Converter } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

// Initialize with optional tags, middleware, and adapters
const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
  tags: {
    defaultStyles: [
      { key: 'p', styles: { marginBottom: '1px', marginTop: '1px' } },
    ],
  },
});

// Parse HTML into an intermediate format
const elements = await converter.parse('<p>Hello, world!</p>');

// Convert parsed elements using a registered adapter (e.g., 'docx')
const outputBuffer = await converter.convert(elements, 'docx');
```

Or with the wrapper package:

```ts
import { init, DocxAdapter } from 'html-to-document';
// wrapper automatically includes core + DOCX adapter
const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
  tags: {
    defaultStyles: [
      { key: 'p', styles: { marginBottom: '1px', marginTop: '1px' } },
    ],
  },
});
const buffer = await converter.convert('<p>Example</p>', 'docx');
```

## Adapters

### Installing an adapter separately

You can install any adapter without the wrapper. For example, to add the DOCX adapter:

```bash
npm install html-to-document-adapter-docx
```

### Registering an adapter

After installing, register it when initializing the core:

```ts
import { init } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
});

// Now you can convert:
const elements = await converter.parse('<p>Hello</p>');
const docxBuffer = await converter.convert(elements, 'docx');
```

## API

### `init(options?: InitOptions): Converter`

- `options`: configuration for tags, middleware, adapters, DOM parser, and **styleInheritance**.
- Returns a `Converter` instance.

#### Customizing Style Inheritance

You can override default inheritance rules (e.g., forcing table borders to inherit to children) using `styleInheritance`:

```ts
const converter = init({
  styleInheritance: {
    border: {
      inherits: true,
      scopes: ['block', 'tableCell'], // Apply to these scopes
    },
  },
  // ... other options
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

### `Converter`

- `parse(html: string): Promise<DocumentElement[]>`  
  Parses HTML string into document elements.
- `convert(elements: DocumentElement[] | string, format: string): Promise<Buffer | Blob>`  
  Converts parsed elements (or HTML string) into the specified format using a registered adapter.
- `useMiddleware(mw: Middleware): void`  
  Add custom middleware for HTML preprocessing.
- `registerConverter(format: string, adapter: IDocumentConverter): void`  
  Register a custom adapter.
- `serialize(elements: DocumentElement[]): string`  
  Serializes a DocumentElement[] back into an HTML string.

## Development

```bash
# At repo root
pnpm install
pnpm run build

# To test core only
cd packages/core
pnpm run test

# Lint and format
pnpm run lint
pnpm run format
```

## License

ISC
