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

- `options`: configuration for tags, middleware, adapters, and DOM parser.
- Returns a `Converter` instance.

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
npm install
npm run build

# To test core only
cd packages/core
npm test

# Lint and format
npm run lint
npm run format
```

## License

ISC
