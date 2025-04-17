import { parseAttributes, parseStyles } from '../utils/html.utils';
import {
  DocumentElement,
  IDOMParser,
  TableCellElement,
  TableRowElement,
  TagHandler,
  TagHandlerObject,
  TagHandlerOptions,
  ListItemElement,
} from './types';
import * as CSS from 'csstype';

class NativeParser implements IDOMParser {
  parse(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
}

// @ToDo: Handle passing of options for tag handlers and maybe Middleware
export class Parser {
  private _tagHandlers: Map<string, TagHandler>;
  private _domParser: IDOMParser;
  private _defaultStyles: Map<
    keyof HTMLElementTagNameMap,
    Partial<Record<keyof CSS.Properties, string | number>>
  >;
  private _defaultAttributes: Map<
    keyof HTMLElementTagNameMap,
    Record<string, string | number>
  >;
  constructor(
    tagHandlers?: TagHandlerObject[],
    domParser?: IDOMParser,
    defaultStyles: {
      key: keyof HTMLElementTagNameMap;
      styles: Partial<Record<keyof CSS.Properties, string | number>>;
    }[] = [],
    defaultAttributes: {
      key: keyof HTMLElementTagNameMap;
      attributes: Record<string, string | number>;
    }[] = []
  ) {
    this._domParser = domParser || new NativeParser();
    this._tagHandlers = new Map();
    this._defaultStyles = new Map();
    this._defaultAttributes = new Map();
    // Add
    if (tagHandlers && tagHandlers.length > 0) {
      tagHandlers.forEach((tHandler) => {
        this._tagHandlers.set(tHandler.key, tHandler.handler);
      });
    }
    defaultStyles.forEach((style) => {
      this._defaultStyles.set(style.key, style.styles);
    });
    defaultAttributes.forEach((attribute) => {
      this._defaultAttributes.set(attribute.key, attribute.attributes);
    });
    this._parseElement = this._parseElement.bind(this);
    this._parseHTML = this._parseHTML.bind(this);
    this._defaultHandler = this._defaultHandler.bind(this);
  }

  public registerTagHandler(tag: string, handler: TagHandler) {
    // They are case insensitive
    this._tagHandlers.set(tag.toLowerCase(), handler);
  }

  parse(html: string) {
    return this._parseHTML(html);
  }

  private _parseElement(
    element: HTMLElement | ChildNode,
    handler: TagHandler,
    options: TagHandlerOptions = {}
  ): DocumentElement {
    // If this is a text node, return it as is
    if (element.nodeType === 3) {
      return {
        type: 'text',
        text: element.textContent || '',
        ...options,
      };
    }
    let styles = parseStyles(element as HTMLElement);
    let attributes = parseAttributes(element as HTMLElement);

    // Add default attributes
    attributes = {
      ...(this._defaultAttributes.get(
        (
          element as HTMLElement
        ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      ) ?? {}),
      ...options.attributes,
      ...attributes,
    };

    // Add default styles
    styles = {
      ...(this._defaultStyles.get(
        (
          element as HTMLElement
        ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      ) ?? {}),
      ...options.styles,
      ...styles,
    };

    // Extract children
    let children: DocumentElement[] | undefined = undefined;
    if (
      !(element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)
    ) {
      const tag = element.nodeName.toLowerCase();
      const isList = tag === 'ul' || tag === 'ol' || tag === 'li';
      const newLevel =
        options &&
        options.metadata &&
        typeof options.metadata.level !== 'undefined' &&
        typeof options.metadata.level === 'string'
          ? tag === 'li'
            ? (parseInt(options.metadata.level || '0') + 1).toString()
            : options.metadata.level
          : '0';
      children = Array.from(element.childNodes).map((child) => {
        const key = child.nodeName.toLowerCase();
        return this._parseElement(
          child,
          this._tagHandlers.get(key) ?? this._defaultHandler,
          isList
            ? {
                metadata: {
                  level: newLevel,
                },
              }
            : {}
        );
      });
    }
    // Extract text
    const text =
      children === undefined
        ? element.textContent
          ? element.textContent
          : undefined
        : undefined;
    return handler(element as HTMLElement, {
      ...options,
      styles,
      attributes,
      content: children,
      text,
    });
  }

  private _parseTable(
    element: HTMLElement | ChildNode,
    options: TagHandlerOptions = {}
  ): DocumentElement {
    const rows: TableRowElement[] = [];
    const defaultStyles = this._defaultStyles.get(
      (
        element as HTMLElement
      ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
    );
    const defaultAttributes = this._defaultAttributes.get(
      (
        element as HTMLElement
      ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
    );
    // Query all trs (Perhaps we lose the styles of thead, tbody and tfooter so we need to fix this)
    const trElements = (element as Element).querySelectorAll('tr');
    trElements.forEach((tr) => {
      const cells: TableCellElement[] = [];
      const styles = parseStyles(tr as HTMLElement);
      const defaultStyles = this._defaultStyles.get(
        (tr as HTMLElement).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      );
      const defaultAttributes = this._defaultAttributes.get(
        (tr as HTMLElement).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      );
      const attributes = parseAttributes(tr as HTMLElement);
      tr.querySelectorAll('td, th').forEach((cell) => {
        const styles = parseStyles(cell as HTMLElement);
        const attributes = parseAttributes(cell as HTMLElement);
        const defaultAttributes = this._defaultAttributes.get(
          cell.localName.toLowerCase() as keyof HTMLElementTagNameMap
        );
        const defaultStyles = this._defaultStyles.get(
          cell.localName.toLowerCase() as keyof HTMLElementTagNameMap
        );
        const content = this._parseHTML(cell.innerHTML);
        const cellElement: TableCellElement = {
          type: 'table-cell',
          content,
          styles:
            cell.localName === 'th'
              ? {
                  textAlign: 'center',
                  ...defaultStyles,
                  ...styles,
                }
              : styles,
          attributes: { ...defaultAttributes, ...attributes },
          colspan: cell.getAttribute('colspan')
            ? Number(cell.getAttribute('colspan'))
            : defaultAttributes && defaultAttributes['colspan'] !== undefined
              ? Number(defaultAttributes['colspan'])
              : 1,
          rowspan: cell.getAttribute('rowspan')
            ? Number(cell.getAttribute('rowspan'))
            : defaultAttributes && defaultAttributes['rowspan'] !== undefined
              ? Number(defaultAttributes['rowspan'])
              : 1,
        };
        cells.push(cellElement);
      });
      rows.push({
        cells,
        styles: { ...defaultStyles, ...styles },
        attributes: { ...defaultAttributes, ...attributes },
      });
    });

    return {
      type: 'table',
      rows,
      styles: { ...defaultStyles, ...options.styles },
      attributes: { ...defaultAttributes, ...options.attributes },
    };
  }

  private _parseHTML(html: string): DocumentElement[] {
    const doc = this._domParser.parse(html);
    const content: DocumentElement[] = [];

    doc.body.childNodes.forEach((child) => {
      const key = child.nodeName.toLowerCase();
      content.push(
        this._parseElement(
          child,
          this._tagHandlers.get(key) ?? this._defaultHandler
        )
      );
    });
    return content;
  }

  private _defaultHandler(
    element: HTMLElement | ChildNode,
    options: TagHandlerOptions = {}
  ): DocumentElement {
    if (element.nodeType === 3) {
      return {
        type: 'text',
        text: element.textContent || '',
      };
    }
    const tag =
      (element as HTMLElement).tagName?.toLowerCase() ||
      (element as ChildNode).nodeName?.toLowerCase();
    if (tag === 'table') {
      return this._parseTable(element, options);
    }
    // Now just use options.text and options.content (children)
    const text = (options.text ?? undefined) as string | undefined;
    const children = (options.content ?? undefined) as
      | DocumentElement[]
      | ListItemElement[]
      | undefined;

    switch (tag) {
      case 'p':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
        };
      case 'strong':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), fontWeight: 'bold' },
        };
      case 'em':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), fontStyle: 'italic' },
        };
      case 'u':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), textDecoration: 'underline' },
        };
      case 'hr':
        return {
          type: 'line',
          ...options,
        };
      case 'h1':
      case 'h2':
      case 'h3':
        return {
          type: 'heading',
          level: Number(tag.slice(1)),
          text,
          content: children,
          ...options,
        };
      case 'ul':
      case 'ol':
        return {
          type: 'list',
          text,
          listType: tag === 'ol' ? 'ordered' : 'unordered',
          content: children,
          level:
            typeof options?.metadata?.level !== 'undefined'
              ? typeof options.metadata.level === 'string'
                ? parseInt(options.metadata.level)
                : typeof options.metadata.level === 'number'
                  ? options.metadata.level
                  : 0
              : 0,
          ...options,
          metadata: {
            ...options.metadata,
            level: options?.metadata?.level || '0',
          },
        };
      case 'li':
        return {
          type: 'list-item',
          text,
          level:
            typeof options?.metadata?.level !== 'undefined'
              ? typeof options.metadata.level === 'string'
                ? parseInt(options.metadata.level)
                : typeof options.metadata.level === 'number'
                  ? options.metadata.level
                  : 0
              : 0,
          content: children,
          ...options,
        };
      // @Todo: THink about even more nesting (Generally think about how to handle inline vs block)
      // Perhaps do the recursive thing with text as well, such that it returns multiple text runs
      case 'span':
      case 'a':
        return {
          type: 'text',
          text: text,
          content: children,
          ...options,
        };
      case 'sup':
        return {
          type: 'text',
          text,
          content: children,
          styles: {
            verticalAlign: 'super',
          },
        };
      case 'sub':
        return {
          type: 'text',
          text,
          content: children,
          styles: {
            verticalAlign: 'sub',
          },
        };
      case 'img':
        return {
          type: 'image',
          src: (element as HTMLImageElement).src,
          ...options,
        };
      case 'pre':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
        };
      case 'code':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: {
            backgroundColor: 'lightGray',
          },
        };
      case 'br':
        return {
          ...options,
          type: 'text',
          text: '',
          metadata: { break: 1, ...options.metadata },
        };
      case 'blockquote':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
          styles: {
            borderLeftColor: 'lightGray',
            borderLeftStyle: 'solid',
            borderLeftWidth: 2,
            paddingLeft: '16px',
            marginLeft: '24px',
            ...(options.styles || {}),
          },
        };
      default:
        return {
          type: 'custom',
          text,
          content: children,
          ...options,
        };
    }
  }
}
