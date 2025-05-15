---
id: tags
title: Custom Tag Handlers
sidebar_position: 3
---

# 🏷 Custom Tag Handlers & Default Element Behavior

The parser in [`html-to-document`](./html-to-document) allows you to **intercept or override** how specific HTML tags are transformed into intermediate [`DocumentElement`](./types) nodes.

This is extremely powerful for adapting to different HTML inputs — whether you're customizing list levels, handling custom tags, or preprocessing structural elements.

---

## 🧩 Tag Handlers

You can provide your own tag handlers using the `tags.tagHandlers` array when initializing the converter via [`init`](./html-to-document).

Each handler implements the [`TagHandlerObject`](./types) interface, specifying a `key` (HTML tag name) and a `handler` function.

```ts
import { TagHandlerObject, init } from 'html-to-document';

const customHandler: TagHandlerObject = {
  key: 'custom-element',
  handler: (element, options) => ({
    type: 'paragraph',
    text: element.textContent || '',
    styles: {
      fontStyle: 'italic',
      ...(options?.styles || {}),
    },
  }),
};

const converter = init({
  tags: {
    tagHandlers: [customHandler],
  },
});
```

The `handler()` receives:

- `element`: The raw `HTMLElement`
- `options`: Precomputed values like:
  - `text` (plain content)
  - `content` (parsed children)
  - `styles` (flattened computed + inline + defaults)
  - `attributes` (HTML attributes + defaults)
  - `metadata` (e.g., list level)
  - `level`, `colspan`, `rowspan`, etc.

The handler must return either:
- A single `DocumentElement`, or
- An array of `DocumentElement` nodes

---

## 🧰 Built-in Tag Support

The parser includes internal support for many tags:

- **block elements**: `p`, `div`, `h1`–`h6`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`
- **inline elements**: `strong`, `em`, `u`, `sup`, `sub`, `span`, `a`, `br`
- **media**: `img`, `figure`, `figcaption`
- **table**: `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`, `col`, `colgroup`, `caption`
- **semantic**: `dl`, `dt`, `dd`

The default handler falls back to `type: 'custom'` if a tag is unknown.

You can override any of these by providing your own handler for that tag.

---

## 🧾 Default Styles and Attributes

In addition to tag handlers, you can also specify **default styles** and **attributes** that apply *before* parsing:

```ts
const converter = init({
  tags: {
    defaultStyles: [
      { key: 'p', styles: { marginBottom: 10, lineHeight: 1.5 } },
    ],
    defaultAttributes: [
      { key: 'img', attributes: { width: 600 } },
    ],
  },
});
```

- `defaultStyles`: Set fallback `styles` per HTML tag before parsing
- `defaultAttributes`: Set fallback `attributes` per tag (e.g., size, alignment)

These apply *in addition to* inline styles or attributes in the HTML.

---

## 🔁 Runtime Handler Registration

You can also register handlers after initialization:

```ts
converter.parser.registerTagHandler('custom-element', handlerFn);
```

Useful for dynamic extension or plugin behavior.

---

## 🧠 Summary

| Feature                  | Description |
|--------------------------|-------------|
| `tagHandlers`            | Override how specific HTML tags are parsed |
| `defaultStyles`          | Set base styles for HTML tags |
| `defaultAttributes`      | Set base attributes (like `width` for `img`) |
| [`TagHandlerObject`](./types)       | Defines a `key` (tag) and a `handler` function |
| `handler()` return       | Must return a `DocumentElement` or array thereof |
| `registerTagHandler()`   | Add handlers dynamically after init |

Need more control? You can also subclass the `Parser` directly or extend the converter behavior for advanced parsing workflows.