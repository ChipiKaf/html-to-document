---
id: intro
title: Getting Started
sidebar_position: 1
---

# Getting Started

**html-to-document** is a flexible library for converting HTML into structured document formats like DOCX, PDF, and more. This guide helps you get started quickly.

## Installation

Install the library using npm:

```bash
npm install html-to-document
```

## Quick Start

Here's a minimal example to convert HTML into a DOCX file:

```ts
import { init, DocxAdapter } from 'html-to-document';
import fs from 'fs';

const converter = init({
  adapters: {
    register: [
      { format: 'docx', adapter: DocxAdapter },
    ],
  },
});

const html = '<h1>Hello World</h1>';
const buffer = await converter.convert(html, 'docx');   // ↩️ Buffer in Node / Blob in browser
fs.writeFileSync('output.docx', buffer);
```

This will return a `Buffer` (in Node.js) or a `Blob` (in browsers) representing the DOCX file.

## Learn More

Explore how to customize the conversion process:

- [Tag Handlers & Parsing Logic](/docs/api/tags)
- [Style Mappings](/docs/api/style-mappings)
- [Custom Adapters](/docs/api/converters)

Or dive into the [API Reference](/docs/api/html-to-document) for full method documentation.