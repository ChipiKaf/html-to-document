---
id: adapters
title: Style Mappings & Default Styles
sidebar_position: 3
---

# 🎨 Style Mappings & Default Styles

Adapters convert the intermediate [`DocumentElement[]`](./types) into a specific output format (e.g., DOCX, PDF). One of the most powerful features of [`html-to-document`](./html-to-document) is that you can **fully control how CSS styles are interpreted** by those adapters — or provide defaults when HTML styles are missing.

---

## 🔧 What Are Style Mappings?

A **style mapping** defines how HTML/CSS styles like `font-weight`, `text-align`, or `padding` should be transformed into document-native properties (e.g., for DOCX: `{ bold: true }` or `{ spacing: { line: 240 } }`).

You can register these mappings per format using the `adapters.styleMappings` array during [`init`](./html-to-document).

---

## ✅ Example: Custom Style Mapping for DOCX

For type definitions like `StyleMapping`, see the [Types Reference](./types).

```ts
import { init, StyleMapping } from 'html-to-document';

const mapping: StyleMapping = {
  fontWeight: (value) => ({ bold: value === 'bold' }),
  fontStyle: (value) => ({ italics: value === 'italic' }),
  color: (value) => ({ color: value }), // use hex or theme color string
};

const converter = init({
  adapters: {
    styleMappings: [
      {
        format: 'docx',
        handlers: mapping,
      },
    ],
  },
});
```

Now, any HTML content like `<p style="font-weight: bold">Bold text</p>` will be interpreted and rendered as bold in the DOCX output.

---

## 💡 When Would You Use This?

- To override default interpretation of CSS
- To convert inline styles into well-formed document formatting
- To add support for new styles like `background-color`, `margin`, `border`, etc.
- To handle platform-specific styles (e.g., Google Docs HTML quirks)

---

## 🖌️ Default Styles for Adapters

You can define **fallback styles** for specific element types using `adapters.defaultStyles`. These are applied when the HTML element does not explicitly define any style.

```ts
const converter = init({
  adapters: {
    defaultStyles: [
      {
        format: 'docx',
        styles: {
          heading: { color: 'darkblue', fontSize: 24 },
          paragraph: { lineHeight: 1.8 },
          'table-cell': { padding: '6px' },
        },
      },
    ],
  },
});
```

Each `styles` object uses the internal `ElementType` keys, such as:
- `paragraph`
- `heading`
- `text`
- `table-cell`
- `list-item`
- etc.

---

## 🧠 About the Built-in StyleMapper

Internally, each adapter uses a `StyleMapper` instance to apply mappings. The `docx` adapter includes comprehensive mappings for:

| CSS Property         | Mapped To (docx)                 |
|----------------------|----------------------------------|
| `font-weight`        | `{ bold: true }`                 |
| `font-style`         | `{ italics: true }`              |
| `text-align`         | `{ alignment: 'center' }`        |
| `color`              | `{ color: '#RRGGBB' }`           |
| `background-color`   | `{ shading: { fill: ... } }`     |
| `font-size`          | `{ size: px × 1.5 }`             |
| `line-height`        | `{ spacing: { line: value×240 }}`|
| `margin/padding`     | `{ spacing, indent, margins }`   |
| `border`             | `{ borders or outline }`         |

You can override or extend this behavior by adding your own `StyleMapping`.

Each style mapping function receives two arguments:

```ts
(key: keyof CSS.Properties, value: string | number, el: DocumentElement) => object
```

This allows for **context-aware styling**, meaning you can vary the output depending on the element type.

For example, here’s how the built-in `margin` mapper behaves differently depending on the element:

```ts
margin: (v: string, el: DocumentElement) => {
  const raw = String(v).trim();
  const px = parseFloat(raw);
  if (isNaN(px)) return {};

  const floatDir = (el.styles as { float: string })?.float;
  if (el.type === 'image' && (floatDir === 'left' || floatDir === 'right')) {
    const dist = pixelsToTwips(px);
    return {
      floating: {
        wrap: {
          margins: { distL: dist, distR: dist, distT: dist, distB: dist },
        },
      },
    };
  }

  if (el.type === 'table') return {};

  if (el.type === 'table-cell') {
    const space = pixelsToTwips(px);
    return {
      margins: { top: space, bottom: space, left: space, right: space },
    };
  }

  const before = px * 20;
  const after = px * 20;
  const horiz = pixelsToTwips(px);
  return {
    spacing: { before, after },
    indent: { left: horiz, right: horiz },
  };
}
```

This flexibility makes `StyleMapper` a powerful mechanism for fine-tuning how layout and design decisions translate across formats.

---

## 🧱 Advanced: Replace or Extend StyleMapper

You can also instantiate a `StyleMapper` manually and pass it into your adapter:

```ts
import { StyleMapper } from 'html-to-document';

const customMapper = new StyleMapper();
customMapper.addMapping({
  letterSpacing: (v) => ({ characterSpacing: parseFloat(v) * 10 }),
});

const adapter = new DocxAdapter({ styleMapper: customMapper });
converter.registerConverter('docx', adapter);
```

---

## 📝 Summary

| Feature             | Purpose                                        |
|---------------------|------------------------------------------------|
| `styleMappings`     | Maps CSS styles → document format properties   |
| `defaultStyles`     | Applies fallback styles for missing styles     |
| `StyleMapper`       | Built-in logic engine for mapping styles       |
| `.addMapping()`     | Extend or override the behavior dynamically    |

Want more detail? Explore the [StyleMapper source](https://github.com/ChipiKaf/html-to-document/blob/main/src/core/style.mapper.ts) for complete coverage.