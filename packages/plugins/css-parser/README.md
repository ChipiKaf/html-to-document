# html-to-document-plugin-css-parser

Parses `<style>` tags from an HTML document and appends the resulting CSS statements to the per-parse stylesheet used by `html-to-document`.

## Installation

```sh
pnpm add html-to-document-plugin-css-parser
```

## Usage

```ts
import { init } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';
import { cssParserPlugin } from 'html-to-document-plugin-css-parser';

const converter = init({
  plugins: [cssParserPlugin()],
  adapters: {
    register: [{ format: 'docx', adapter: DocxAdapter }],
  },
});

const output = await converter.convert(
  '<style>.title { color: #3366ff; font-weight: bold; }</style><p class="title">Hello</p>',
  'docx'
);
```

By default the plugin removes `<style>` elements from the DOM after their CSS is added to the parse-session stylesheet. Disable that behavior if you want those elements to remain in the parsed document.

```ts
cssParserPlugin({ removeStyleElements: false });
```

If you use the aggregate package, you can import the plugin from `html-to-document` instead.

```ts
import { init, cssParserPlugin } from 'html-to-document';
```
