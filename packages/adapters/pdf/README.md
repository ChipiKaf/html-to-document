# html-to-document-adapter-pdf

**PDF adapter for the html-to-document core library.**

## Installation

```bash
# Install this adapter (This assumes you have already installed
html-to-document or html-to-document-core) :

npm install html-to-document-adapter-pdf
```

> If you're using the wrapper package (`html-to-document`), you'll still need to install this adapter separately.

For documentation on the wrapper:  
https://www.npmjs.com/package/html-to-document

## Usage

```ts
import { init } from 'html-to-document';
import { PdfAdapter } from 'html-to-document-adapter-pdf';

const converter = init({
  adapters: {
    register: [{ format: 'pdf', adapter: PdfAdapter }],
    defaultStyles: [
      {
        format: 'pdf',
        styles: {
          paragraph: { lineHeight: 1.5 },
          heading: { fontSize: '18px', fontWeight: 'bold' },
        },
      },
    ],
    styleMappings: [
      {
        format: 'pdf',
        handlers: {
          fontWeight: (v) => ({ bold: v === 'bold' }),
          textAlign: (v) => ({ align: v }),
        },
      },
    ],
  },
});

// Convert HTML string to PDF Blob or Buffer:
const htmlString = '<h1>Hello, PDF!</h1><p>This is a test.</p>';
const elements = await converter.parse(htmlString);
const pdfBlob = await converter.convert(elements, 'pdf');
// Use `pdfBlob` to download or save the file.
```

## API

### `PdfAdapter`

Adapter class implementing `IDocumentConverter` for PDF.

#### Constructor

```ts
new PdfAdapter(options: {
  styleMapper: StyleMapper;
  defaultStyles?: Record<string, any>;
});
```

- `styleMapper`: a `StyleMapper` instance carrying style mappings.
- `defaultStyles`: optional defaults for styling elements.

#### Methods

- `convert(elements: DocumentElement[]): Promise<Buffer | Blob>`  
  Converts parsed document elements into a PDF output.

## Development

1. Clone the repo and run `bun install` at the root.
2. Build all workspaces: `bun run build`.
3. To test this adapter only:
   ```bash
   cd packages/adapters/pdf
   bun run test
   ```
4. Lint and format from root: `bun run lint` / `bun run format`.

## License

ISC
