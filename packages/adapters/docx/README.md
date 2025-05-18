# html-to-document-adapter-docx

**Docx adapter for the html-to-document core library.**

## Installation

```bash
# Wrapper (includes core + default adapters):
npm install html-to-document

# Or install core + this adapter separately:
npm install html-to-document-core html-to-document-adapter-docx
```

For full documentation on the wrapper package, see:  
https://www.npmjs.com/package/html-to-document

## Usage

```ts
// Using core directly:
import { init } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

// Or using the wrapper:
import { init, DocxAdapter } from 'html-to-document';

const converter = init({
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
    defaultStyles: [
      {
        format: 'docx',
        styles: {
          /* your default styles, e.g.: */
          heading: { color: 'black', fontFamily: 'Arial', marginTop: '10px' },
          paragraph: { lineHeight: 1.5 },
        },
      },
    ],
    styleMappings: [
      {
        format: 'docx',
        handlers: {
          /* custom style handlers, e.g.: */
          textAlign: (value) => ({ alignment: value }),
        },
      },
    ],
  },
});

// Convert HTML string to DOCX buffer:
const htmlString = '<p>Hello, world!</p>';
const elements = await converter.parse(htmlString);
const docxBuffer = await converter.convert(elements, 'docx');
// Use `docxBuffer` to download or write to file.
```

## API

### `DocxAdapter`

Adapter class implementing `IDocumentConverter` for DOCX.

#### Constructor

```ts
new DocxAdapter(options: {
  styleMapper: StyleMapper;
  defaultStyles?: Record<string, any>;
});
```

- `styleMapper`: a `StyleMapper` instance carrying style mappings.
- `defaultStyles`: optional defaults for styling elements.

#### Methods

- `convert(elements: DocumentElement[]): Promise<Buffer>`  
  Converts parsed document elements into a DOCX `Buffer`.

## Development

1. Clone the repo and run `npm install` at the root.
2. Build all workspaces: `npm run build`.
3. To test this adapter only:
   ```bash
   cd packages/adapters/docx
   npm test
   ```
4. Lint and format from root: `npm run lint` / `npm run format`.

## License

ISC