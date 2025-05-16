---
id: converters
title: Custom Converters
sidebar_position: 6
---

# Custom Converters

You can register custom adapter implementations to handle new output formats by implementing the [`IDocumentConverter`](./types) interface. Adapters receive styling helpers such as [`StyleMapper`](./types) and defaults via their constructor.

## Adapter Constructor & Dependencies

For detailed definitions of the types used here (such as [`IDocumentConverter`](./types), [`DocumentElement`](./types), and [`IConverterDependencies`](./types)), see the [Types Reference](./types).


Custom adapter classes must implement:
```ts
import { IDocumentConverter, DocumentElement, IConverterDependencies } from 'html-to-document';

export class MyAdapter implements IDocumentConverter {
  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    // styleMapper: StyleMapper for CSS→format mapping
    // defaultStyles?: default style definitions per element type
  }

  async convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    // Iterate elements, merge defaults and element styles
    for (const el of elements) {
      const base = defaultStyles?.[el.type] || {};
      const merged = { ...base, ...el.styles };
      const props = styleMapper.mapStyles(merged, el);
      // create format-specific nodes using props
    }
    return new Blob();
  }
}
```

### Quickstart Guide: Writing a Minimal Custom Adapter

Here's a barebones adapter that outputs plain text from paragraphs and headings. This helps you understand how to traverse and transform [`DocumentElement`](./types) nodes.

```ts
import { IDocumentConverter, DocumentElement, IConverterDependencies } from 'html-to-document';

export class PlainTextAdapter implements IDocumentConverter {
  private mapper: StyleMapper;
  constructor({ styleMapper, defaultStyles }: IConverterDependencies) {
    this.mapper = styleMapper;
    this.defaults = defaultStyles ?? {};
  }

  async convert(elements: DocumentElement[]): Promise<Blob> {
    const text = elements.map(el => {
      const styles = { ...this.defaults[el.type], ...el.styles };
      const props = this.mapper.mapStyles(styles, el);
      switch (el.type) {
        case 'paragraph':
          return (el.text ?? '') + '\n\n';
        case 'heading':
          return '#'.repeat(el.level || 1) + ' ' + (el.text ?? '') + '\n\n';
        case 'text':
          return props.bold ? '**' + (el.text ?? '') + '**' : (el.text ?? '');
        default:
          return '';
      }
    }).join('');
    
    return new Blob([text], { type: 'text/plain' });
  }
}
```

You can build on this to support more types like tables, images, and lists.


## Register During Initialization (Recommended)

Provide adapter classes implementing `IDocumentConverter` via the `adapters.register` option:
```ts
import { init } from 'html-to-document';
import { MyAdapter } from './my-adapter';

const converter = init({
  adapters: {
    // Register your adapter
    register: [
      { format: 'md', adapter: MyAdapter },
    ],
  },
});
```

You can also supply default styles and style mappings for your custom adapter:

```ts
const converter = init({
  adapters: {
    register: [ { format: 'md', adapter: MyAdapter } ],
    defaultStyles: [
      { format: 'md', styles: { paragraph: { marginBottom: 8, lineHeight: 1.6 } } },
    ],
    styleMappings: [
      { format: 'md', handlers: { fontWeight: (v) => ({ bold: v === 'bold' }) } },
    ],
  },
});
```

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
This method works well cause it handles the initialization of the style mapper and other dependencies for you.

## Register at Runtime

After creating a `Converter` instance, call `registerConverter`:
```ts
const converter = init();
converter.registerConverter('md', new MyAdapter({ /* deps */ }));
```

> **Note:** When registering at runtime, you must supply an `IConverterDependencies` object, typically:
> ```ts
> import { StyleMapper } from 'html-to-document';
> const styleMapper = new StyleMapper();
> // Optionally add mappings:
> styleMapper.addMapping({ fontWeight: (v) => ({ bold: v === 'bold' }) });
> const defaultStyles = { paragraph: { lineHeight: 1.5 } };
> converter.registerConverter(
>   'md',
>   new MyAdapter({ styleMapper, defaultStyles })
> );
> ```