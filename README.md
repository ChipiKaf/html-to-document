<!-- prettier-ignore-start -->
[![npm version](https://img.shields.io/npm/v/html-to-document.svg)](https://www.npmjs.com/package/html-to-document)
[![Build Status](https://github.com/ChipiKaf/html-to-document/actions/workflows/ci.yml/badge.svg)](https://github.com/ChipiKaf/html-to-document/actions)
[![License: ISC](https://img.shields.io/npm/l/html-to-document.svg)](LICENSE)
<!-- prettier-ignore-end -->

# html‑to‑document

> **Convert any HTML into production‑ready documents — DOCX today, PDF/XLSX tomorrow.**

`html‑to‑document` parses HTML into an intermediate, format‑agnostic tree and then feeds that tree to **adapters** (e.g. DOCX, PDF).  
Write HTML → get Word, PDFs, spreadsheets, and more — all with one unified TypeScript API.

---

## ✨ Key Features
| Feature | Description |
|---------|-------------|
| **Format‑agnostic core** | Converts HTML into a reusable `DocumentElement[]` structure |
| **DOCX adapter (built‑in)** | Powered by [`docx`](https://npmjs.com/package/docx) with rich style support |
| **Pluggable adapters** | Add your own adapter for PDF, XLSX, Markdown, etc. |
| **Style mapping engine** | Map CSS → document styles and set per‑format defaults |
| **Custom tag handlers** | Override or extend how any HTML tag is parsed |
| **Middleware pipeline** | Transform or sanitise HTML before parsing |

---

## 📦 Installation
```bash
npm install html-to-document
```

---

## 🚀 Quick Start
```ts
import { init } from 'html-to-document';
import fs from 'fs';

const converter = init();                // default DOCX adapter & middleware
const html = '<h1>Hello World</h1>';

const buffer = await converter.convert(html, 'docx');   // ↩️ Buffer in Node / Blob in browser
fs.writeFileSync('output.docx', buffer);
```

Need just the parsed structure?
```ts
const elements = await converter.parse('<p>Some HTML</p>');
console.log(elements); // => DocumentElement[]
```

---

## 📚 Documentation & Demo
| Resource | Link |
|----------|------|
| **Full Docs** | https://chipikaf.github.io/html-to-document/ |
| **Live Demo (TinyMCE)** | https://html-to-document-demo.vercel.app |

---

## 🛠 Extending
- **Style mappings:** fine‑tune CSS → DOCX/PDF with `StyleMapper`
- **Tag handlers:** intercept `<custom-tag>` → your own `DocumentElement`
- **Custom adapters:** implement `IDocumentConverter` to target new formats

See the [Extensibility Guide](https://chipikaf.github.io/html-to-document/docs/extensibility).

---

## 🧑‍💻 Contributing
Contributions are welcome!  
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📝 Changelog
All notable changes are documented in [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License
[ISC](LICENSE) — a permissive, MIT‑style license that allows free use, modification, and distribution without requiring permission.