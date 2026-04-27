---
id: converters
title: Custom Converters
sidebar_position: 6
---

# Custom Converters

You can register custom adapter implementations to handle new output formats by implementing the [`IDocumentConverter`](./types) interface. Adapters receive generic dependencies such as `defaultStyles` and `styleMeta` via their constructor. Format-specific mappers are owned by the adapter package, not by core.

## Adapter Constructor & Dependencies

For detailed definitions of the types used here (such as [`IDocumentConverter`](./types), [`DocumentElement`](./types), and [`IConverterDependencies`](./types)), see the [Types Reference](./types).

Custom adapter classes must implement:

```ts
import {
  IDocumentConverter,
  DocumentElement,
  IConverterDependencies,
} from 'html-to-document';

export class MyAdapter implements IDocumentConverter {
  constructor({ defaultStyles, styleMeta }: IConverterDependencies) {
    // defaultStyles?: default style definitions per element type
    // styleMeta?: style inheritance metadata
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    // Iterate elements, merge defaults and element styles
    for (const el of elements) {
      const base = defaultStyles?.[el.type] || {};
      const merged = { ...base, ...el.styles };
      // create format-specific nodes using merged + styleMeta
    }
    return new Blob();
  }
}
```

For more details on `styleMeta` and inheritance configuration, see the [Initialization options](./init#styleinheritance).

### Quickstart Guide: Writing a Minimal Custom Adapter

Here's a barebones adapter that outputs plain text from paragraphs and headings. This helps you understand how to traverse and transform [`DocumentElement`](./types) nodes.

```ts
import {
  IDocumentConverter,
  DocumentElement,
  IConverterDependencies,
} from 'html-to-document';

export class PlainTextAdapter implements IDocumentConverter {
  private defaults: Record<string, any>;
  private styleMeta: IConverterDependencies['styleMeta'];

  constructor({ defaultStyles, styleMeta }: IConverterDependencies) {
    this.defaults = defaultStyles ?? {};
    this.styleMeta = styleMeta;
  }

  async convert(elements: DocumentElement[]): Promise<Blob> {
    const text = elements
      .map((el) => {
        const styles = { ...this.defaults[el.type], ...el.styles };
        switch (el.type) {
          case 'paragraph':
            return (el.text ?? '') + '\n\n';
          case 'heading':
            return '#'.repeat(el.level || 1) + ' ' + (el.text ?? '') + '\n\n';
          case 'text':
            return styles.fontWeight === 'bold'
              ? '**' + (el.text ?? '') + '**'
              : (el.text ?? '');
          default:
            return '';
        }
      })
      .join('');

    return new Blob([text], { type: 'text/plain' });
  }
}
```

For more details on `styleMeta` and inheritance configuration, see the [Initialization options](./init#styleinheritance).

You can build on this to support more types like tables, images, and lists.

## Element Converter Examples

You can also register custom block, inline, and fallthrough converters by
implementing the respective interfaces. Below is a generic example:

```ts
import {
  IBlockConverter,
  IInlineConverter,
  IFallthroughConvertedChildrenWrapperConverter,
  ElementConverterDependencies,
  filterForScope,
} from 'html-to-document-core';
import {
  DocumentElement,
  HeadingElement,
  TextElement,
  Styles,
} from 'html-to-document-core';

// Block converter: handles heading elements
class HeadingBlockConverter implements IBlockConverter<HeadingElement> {
  isMatch(el: DocumentElement): el is HeadingElement {
    return el.type === 'heading';
  }
  convertElement(
    deps: ElementConverterDependencies,
    el: HeadingElement,
    styles: Styles = {}
  ) {
    // You can access styleMeta from dependencies:
    const { styleMeta } = deps;
    // Example: Use it to filter styles for this scope
    // const filtered = filterForScope(styles, 'block', styleMeta);

    // implement conversion logic for headings
    return [];
  }
}

// Inline converter: handles bold text nodes
class BoldInlineConverter implements IInlineConverter<TextElement> {
  isMatch(el: DocumentElement): el is TextElement {
    return el.type === 'text' && el.styles.fontWeight === 'bold';
  }
  convertElement(
    deps: ElementConverterDependencies,
    el: TextElement,
    styles: Styles
  ) {
    // implement conversion logic for bold text
    return [];
  }
}

// Fallthrough converter: wraps converted children based on attributes
class IdFallthroughConverter
  implements IFallthroughConvertedChildrenWrapperConverter
{
  isMatch(el: DocumentElement): boolean {
    return Boolean(el.attributes?.id);
  }
  fallthroughWrapConvertedChildren(
    deps: ElementConverterDependencies,
    el: DocumentElement,
    children: any[],
    styles: Styles,
    index?: number
  ) {
    // implement fallthrough logic
    return children;
  }
}
```

## Register During Initialization (Recommended)

Provide adapter classes implementing `IDocumentConverter` via the `adapters.register` option:

```ts
import { init } from 'html-to-document';
import { MyAdapter } from './my-adapter';

const converter = init({
  adapters: {
    // Register your adapter
    register: [
      {
        format: 'md',
        adapter: MyAdapter,
        // Optional adapter-specific configuration:
        // config: { /* adapter options */ },
      },
    ],
  },
});
```

You can also supply default styles for your custom adapter:

```ts
const converter = init({
  adapters: {
    register: [
      {
        format: 'md',
        adapter: MyAdapter,
        // Optional adapter-specific configuration:
        // config: { /* adapter options */ },
      },
    ],
    defaultStyles: [
      {
        format: 'md',
        styles: { paragraph: { marginBottom: 8, lineHeight: 1.6 } },
      },
    ],
  },
});
```

If you need full control over adapter construction, add a `createAdapter` factory to the adapter registration. It receives the computed `dependencies`, the adapter class, the target `format`, and the registration `config`:

```ts
const converter = init({
  adapters: {
    register: [
      {
        format: 'md',
        adapter: MyAdapter,
        createAdapter: ({ Adapter, dependencies, config, format }) => {
          if (format === 'md') {
            return new Adapter(
              {
                ...dependencies,
                defaultStyles: {
                  ...dependencies.defaultStyles,
                  paragraph: { marginBottom: 8, lineHeight: 1.6 },
                },
              },
              config
            );
          }

          return new Adapter(dependencies, config);
        },
      },
    ],
  },
});
```

`init()` creates a fresh dependency object for each adapter registration, so mutations inside one `createAdapter` call do not leak into other adapters.

The `MyAdapter` class should implement:

```ts
import { IDocumentConverter, DocumentElement } from 'html-to-document';

export class MyAdapter implements IDocumentConverter {
  constructor(private options: any) {}
  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    // Implement conversion logic here
    return new Blob();
  }
}
```

This method works well because it handles the initialization of generic adapter dependencies for you.

## Register at Runtime

After creating a `Converter` instance, call `registerConverter`:

```ts
const converter = init();
converter.registerConverter(
  'md',
  new MyAdapter({
    /* deps */
  })
);
```

> **Note:** When registering at runtime, you must supply an `IConverterDependencies` object, typically:
>
> ```ts
> import { initStyleMeta } from 'html-to-document';
> const defaultStyles = { paragraph: { lineHeight: 1.5 } };
> converter.registerConverter(
>   'md',
>   new MyAdapter({ defaultStyles, styleMeta: initStyleMeta() })
> );
> ```
