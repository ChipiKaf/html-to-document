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
  ): DocumentElement | undefined {
    // If this is a text node, return it as is
    if (element.nodeType !== 1 && element.nodeType !== 3) {
      return undefined;
    }

    if (
      (element.nodeType === 1 &&
        (element as HTMLElement).tagName.toLowerCase() === 'colgroup') ||
      (element.nodeType === 1 &&
        (element as HTMLElement).tagName.toLowerCase() === 'col')
    ) {
      return undefined;
    }

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
    const tagName = (element as HTMLElement).nodeName.toLowerCase();

    if (
      !(element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)
    ) {
      const isList = tagName === 'ul' || tagName === 'ol' || tagName === 'li';
      const newLevel =
        options &&
        options.metadata &&
        typeof options.metadata.level !== 'undefined' &&
        typeof options.metadata.level === 'string'
          ? tagName === 'li'
            ? (parseInt(options.metadata.level || '0') + 1).toString()
            : options.metadata.level
          : '0';
      children = Array.from(element.childNodes)
        .map((child) => {
          const key = child.nodeName.toLowerCase();
          const result = this._parseElement(
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
          if (result) {
            return result;
          }
          return undefined;
        })
        .filter((c): c is DocumentElement => c !== undefined);
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
    /* ----------------------------------------------------------
     * 1. Capture <colgroup>/<col> information BEFORE we touch rows
     * ---------------------------------------------------------- */
    const colMeta: {
      width?: string | number;
      styles: Record<string, string | number>;
    }[] = [];

    const colgroupEl = (element as HTMLElement).querySelector('colgroup');
    if (colgroupEl) {
      Array.from(colgroupEl.children)
        .filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'col')
        .forEach((col) => {
          // 'span' lets a single <col> apply to multiple columns
          const span = parseInt(col.getAttribute('span') || '1', 10);
          const styles = parseStyles(col);
          const width = col.getAttribute('width') || styles.width;
          for (let i = 0; i < span; i++) {
            colMeta.push({
              width: width ? width : undefined,
              styles,
            });
          }
        });
    }

    const rows: TableRowElement[] = [];

    // Fetch default table styles & attributes
    const defaultTableStyles = this._defaultStyles.get(
      (
        element as HTMLElement
      ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
    );
    const defaultTableAttrs = this._defaultAttributes.get(
      (
        element as HTMLElement
      ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
    );

    // Helper to parse a <tr> into TableRowElement
    const parseRow = (tr: HTMLElement) => {
      const cells: TableCellElement[] = [];
      let colPtr = 0;
      const rowStyles = {
        ...defaultTableStyles,
        ...parseStyles(tr),
      };
      const rowAttrs = {
        ...defaultTableAttrs,
        ...parseAttributes(tr),
      };
      // Only direct <td>/<th> children to avoid nested tables
      const cellEls = Array.from(tr.children).filter((c): c is HTMLElement => {
        const t = c.tagName.toLowerCase();
        return t === 'td' || t === 'th';
      });

      cellEls.forEach((cell) => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        const columnStyles = colMeta[colPtr]?.styles || {};
        const content = this._parseHTML(cell.innerHTML);
        const cs = parseStyles(cell);
        const ca = parseAttributes(cell);
        const ds =
          this._defaultStyles.get(
            cell.tagName.toLowerCase() as keyof HTMLElementTagNameMap
          ) || {};
        const da =
          this._defaultAttributes.get(
            cell.tagName.toLowerCase() as keyof HTMLElementTagNameMap
          ) || {};
        const colspan = Number(
          cell.getAttribute('colspan') || da['colspan'] || 1
        );
        const rowspan = Number(
          cell.getAttribute('rowspan') || da['rowspan'] || 1
        );

        cells.push({
          type: 'table-cell',
          content,
          styles: isHeader
            ? { textAlign: 'center', ...columnStyles, ...ds, ...cs }
            : { ...columnStyles, ...ds, ...cs },
          attributes: { ...da, ...ca },
          colspan,
          rowspan,
        });
        colPtr += colspan;
      });

      rows.push({
        type: 'table-row',
        cells,
        styles: rowStyles,
        attributes: rowAttrs,
      });
    };

    // Parse <thead>, <tbody>, <tfoot> in semantic order
    ['thead', 'tbody', 'tfoot'].forEach((section) => {
      const secEl = (element as Element).querySelector(section);
      if (secEl) {
        Array.from(secEl.children)
          .filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'tr')
          .forEach((tr) => parseRow(tr));
      }
    });

    // Also parse any <tr> directly under <table>
    Array.from((element as HTMLElement).children)
      .filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'tr')
      .forEach((tr) => parseRow(tr));

    return {
      type: 'table',
      rows,
      styles: { ...defaultTableStyles, ...options.styles },
      attributes: { ...defaultTableAttrs, ...options.attributes },
      metadata: colMeta.length > 0 ? { columns: colMeta } : undefined,
    };
  }

  private _parseHTML(html: string): DocumentElement[] {
    const doc = this._domParser.parse(html);
    const content: DocumentElement[] = [];

    doc.body.childNodes.forEach((child) => {
      // If this is a <div>, inline its children instead of wrapping
      if (
        child.nodeType !== 3 &&
        ((child as HTMLElement).tagName.toLowerCase() === 'colgroup' ||
          (child as HTMLElement).tagName.toLowerCase() === 'col')
      ) {
        return;
      }
      if (
        child.nodeType === 1 &&
        (child as HTMLElement).tagName.toLowerCase() === 'div'
      ) {
        const divEl = child as HTMLElement;
        const wrapperStyles = parseStyles(divEl);
        const wrapperAttrs = parseAttributes(divEl);
        const inner = this._parseHTML(divEl.innerHTML);
        // merge wrapper styles/attrs into each child
        inner.forEach((childElem) => {
          childElem.styles = { ...wrapperStyles, ...childElem.styles };
          childElem.attributes = { ...wrapperAttrs, ...childElem.attributes };
        });
        content.push(...inner);
      } else {
        const key = child.nodeName.toLowerCase();
        if (child.nodeType !== 3 && (key === 'colgroup' || key === 'col')) {
          return;
        }
        const result = this._parseElement(
          child,
          this._tagHandlers.get(key) ?? this._defaultHandler
        );
        if (result) {
          content.push(result);
        }
      }
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
      case 'div':
        return { type: 'paragraph', text, content: children, ...options };

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
        return { type: 'line', ...options };

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
          listType: tag === 'ol' ? 'ordered' : 'unordered',
          content: children,
          level:
            typeof options.metadata?.level === 'number'
              ? options.metadata.level
              : parseInt(options.metadata?.level as string) || 0,
          ...options,
          metadata: {
            ...options.metadata,
            level: options.metadata?.level ?? '0',
          },
        };

      case 'li':
        return {
          type: 'list-item',
          text,
          content: children,
          level:
            typeof options.metadata?.level === 'number'
              ? options.metadata.level
              : parseInt(options.metadata?.level as string) || 0,
          ...options,
        };

      case 'span':
      case 'a':
        return { type: 'text', text, content: children, ...options };

      case 'sup':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { verticalAlign: 'super', ...(options.styles || {}) },
        };

      case 'sub':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { verticalAlign: 'sub', ...(options.styles || {}) },
        };

      case 'img':
        return {
          type: 'image',
          src: (element as HTMLImageElement).src,
          ...options,
        };

      case 'pre':
        return { type: 'paragraph', text, content: children, ...options };

      case 'code':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { backgroundColor: 'lightGray', ...(options.styles || {}) },
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

      // FIGURE and CAPTION now as paragraphs
      case 'figure':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
        };

      case 'figcaption':
      case 'caption':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
          styles: {
            fontStyle: 'italic',
            textAlign: 'center',
            ...(options.styles || {}),
          },
        };

      default:
        return { type: 'custom', text, content: children, ...options };
    }
  }
}
