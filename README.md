<!-- prettier-ignore-start -->
[![npm version](https://img.shields.io/npm/v/html-to-document.svg)](https://www.npmjs.com/package/html-to-document)
[![Build Status](https://github.com/ChipiKaf/html-to-document/actions/workflows/ci.yml/badge.svg)](https://github.com/ChipiKaf/html-to-document/actions)
[![License: ISC](https://img.shields.io/npm/l/html-to-document.svg)](LICENSE)
<!-- prettier-ignore-end -->

# html-to-document

A modular, open source library for converting HTML content into professional document formats. Initially focused on HTML-to-DOCX conversion, with planned support for PDF, XLSX, and more.

> Built with TypeScript, it features a core HTML parsing engine and separate format-specific adapters, offering a unified API for seamless integration.

## Features

- Parse HTML into an intermediate, document-agnostic format
- Convert to DOCX (default) via [`docx`](https://www.npmjs.com/package/docx)
- Middleware support (e.g. minification, custom transformations)
- Extensible adapter registry for additional formats

## Installation

```bash
npm install html-to-document
```

## Usage

```ts
import { init } from 'html-to-document';
import fs from 'fs';

(async () => {
  // Initialize with default adapters and middleware
  const converter = init();

  // Convert HTML string to DOCX buffer
  const buffer = await converter.convert('<h1>Hello World</h1>', 'docx');
  fs.writeFileSync('output.docx', buffer);

  // Or just parse into DocumentElement[]
  const elements = await converter.parse('<p>Some HTML</p>');
  console.log(elements);
})();
```

## API

See [TypeScript definitions](dist/index.d.ts) for full API documentation.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## Changelog

All notable changes are documented in [CHANGELOG.md](CHANGELOG.md).

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.