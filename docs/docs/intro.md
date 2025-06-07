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
import { init } from 'html-to-document';
import fs from 'fs';

// DOCX adapter is included by default
const converter = init();

const html = '<h1>Hello World</h1>';
const buffer = await converter.convert(html, 'docx');   // ↩️ Buffer in Node / Blob in browser
fs.writeFileSync('output.docx', buffer);
```

This will return a `Buffer` (in Node.js) or a `Blob` (in browsers) representing the DOCX file.

## How It Works

Below is a high-level overview of the conversion pipeline. The library processes the HTML input through optional middleware steps, parses it into a structured intermediate representation, and then delegates to an adapter to generate the desired output format.

![Conversion Pipeline Diagram](/img/conversion-pipeline.png)

The stages are:

- **Input**: Raw HTML input as a string.  
- **Middleware**: One or more middleware functions can inspect or transform the HTML string before parsing (e.g., sanitization, custom tags).  
- **Parser**: Converts the (possibly modified) HTML string into an array of `DocumentElement` objects, representing a structured AST.  
- **Adapter**: Takes the parsed `DocumentElement[]` and renders it into the target format (e.g., DOCX, PDF, Markdown) via a registered adapter.

## Learn More

Explore how to customize the conversion process:

- [Tag Handlers & Parsing Logic](/docs/api/tags)
- [Style Mappings](/docs/api/style-mappings)
- [Custom Adapters](/docs/api/converters)

Or dive into the [API Reference](/docs/api/html-to-document) for full method documentation.