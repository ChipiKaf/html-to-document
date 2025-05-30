import {
  extractAttributesToMetadata,
  parseAttributes,
  parseStyles,
} from './utils/html.utils';
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

const getListLevel = (tagName: string, options: TagHandlerOptions) => {
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
  return { isList, newLevel };
};

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
    // Add default handlers
    this._tagHandlers.set('table', this._parseTable.bind(this));
    this._tagHandlers.set('thead', this._parseTableContainers.bind(this));
    this._tagHandlers.set('tbody', this._parseTableContainers.bind(this));
    this._tagHandlers.set('tfoot', this._parseTableContainers.bind(this));
    if (tagHandlers && tagHandlers.length > 0) {
      tagHandlers.forEach((tHandler) => {
        this._tagHandlers.set(tHandler.key, tHandler.handler);
      });
    }
    // Built-in default styles for headings (lowest priority, user overrides by defaultStyles param or inline styles)
    [
      ['h1', { fontSize: '32px', fontWeight: 'bold' }],
      ['h2', { fontSize: '24px', fontWeight: 'bold' }],
      ['h3', { fontWeight: 'bold' }],
      ['h4', { fontWeight: 'bold' }],
      ['h5', { fontWeight: 'bold' }],
      ['h6', { fontWeight: 'bold' }],
    ].forEach(([tag, styles]) => {
      this._defaultStyles.set(
        tag as keyof HTMLElementTagNameMap,
        styles as Record<keyof CSS.Properties, string | number>
      );
    });
    // Apply any user-provided defaultStyles (override built-in headings)
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
    const tree = this._parseHTML(html);
    try {
      Object.defineProperty(tree, '__originalHtml', {
        value: html,
        enumerable: false,
      });
    } catch {}
    return tree;
  }

  private _parseRow(
    tr: HTMLElement,
    options: TagHandlerOptions = {}
  ): TableRowElement {
    const cells: TableCellElement[] = [];
    const rowStyles = { ...options.styles, ...parseStyles(tr) };
    const rowAttrs = { ...options.attributes, ...parseAttributes(tr) };

    Array.from(tr.children)
      .filter((c): c is HTMLElement =>
        ['td', 'th'].includes(c.tagName.toLowerCase())
      )
      .forEach((cell) => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        // parse children of the cell
        const content = Array.from(cell.childNodes).flatMap((node) => {
          const parsed = this._parseElement(
            node,
            this._tagHandlers.get(node.nodeName.toLowerCase()) ??
              this._defaultHandler
          );
          // flatten fragments
          return parsed;
        });

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
            ? { textAlign: 'center', ...ds, ...cs }
            : { ...ds, ...cs },
          attributes: { ...da, ...ca },
          colspan,
          rowspan,
        });
      });

    return {
      type: 'table-row',
      cells,
      styles: rowStyles,
      attributes: rowAttrs,
    };
  }

  private _parseElement(
    element: HTMLElement | ChildNode,
    handler: TagHandler,
    options: TagHandlerOptions = {}
  ): DocumentElement | DocumentElement[] {
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
    let children: DocumentElement[] | undefined;
    const tagName = (element as HTMLElement).nodeName.toLowerCase();
    const shouldWalk =
      tagName === 'div' ||
      !(
        element.childNodes.length === 1 && element.childNodes[0].nodeType === 3
      );
    if (shouldWalk) {
      const { isList, newLevel } = getListLevel(tagName, options);

      children = Array.from(element.childNodes)
        .map((child) => {
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
        })
        .flat();
    }
    // Extract text
    const text =
      children === undefined
        ? element.textContent
          ? element.textContent
          : undefined
        : undefined;
    const result = handler(element as HTMLElement, {
      ...options,
      styles,
      attributes,
      content: children,
      text,
      metadata: {
        ...(options.metadata ?? {}),
        tagName,
      },
    });

    // helper to guarantee tagName is always present
    const ensureTagName = <T extends DocumentElement>(el: T): T => {
      el.metadata = { tagName, ...(el.metadata ?? {}) };
      return el;
    };

    if (Array.isArray(result)) {
      return result.map((el) => extractAttributesToMetadata(ensureTagName(el)));
    }

    ensureTagName(result);

    if (result.type === 'fragment') {
      const wrapperStyles = result.styles || {};
      const wrapperAttrs = result.attributes || {};
      return (result.content || []).map((el) => ({
        ...el,
        styles: { ...wrapperStyles, ...el.styles },
        attributes: { ...wrapperAttrs, ...el.attributes },
      }));
    }

    return extractAttributesToMetadata(result);
  }

  private _parseTableContainers(element: HTMLElement): TableRowElement[] {
    const rows: TableRowElement[] = [];
    Array.from(element.children)
      .filter((c): c is HTMLElement => c.tagName.toLowerCase() === 'tr')
      .forEach((tr) => rows.push(this._parseRow(tr)));
    return rows;
  }

  private _parseTable(
    element: HTMLElement | ChildNode,
    options: TagHandlerOptions = {}
  ): DocumentElement {
    const rows: TableRowElement[] = [];
    const content: DocumentElement[] = [];

    // Fetch defaults
    const defaultTableStyles =
      this._defaultStyles.get(
        (
          element as HTMLElement
        ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      ) || {};
    const defaultTableAttrs =
      this._defaultAttributes.get(
        (
          element as HTMLElement
        ).tagName.toLowerCase() as keyof HTMLElementTagNameMap
      ) || {};

    // Iterate *every* direct child of <table> in source order
    Array.from((element as HTMLElement).childNodes).forEach((node) => {
      if (node.nodeType !== 1) return; // skip text/comments
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      const result = this._parseElement(
        el,
        this._tagHandlers.get(tag) ?? this._defaultHandler
      );

      if (Array.isArray(result)) {
        rows.push(
          ...result.filter((c): c is TableRowElement => c.type === 'table-row')
        );
        content.push(
          ...result.filter((c): c is DocumentElement => c.type !== 'table-row')
        );
      } else {
        if (result.type === 'table-row') {
          rows.push(result as TableRowElement);
        }
        if (result.type !== 'table-row') {
          content.push(result as DocumentElement);
        }
      }
    });
    return {
      type: 'table',
      rows,
      content: content.length > 0 ? content : undefined,
      styles: {
        ...defaultTableStyles,
        ...options.styles,
      },
      metadata: {
        ...options.metadata,
        nested: element.parentElement?.tagName.toLowerCase() === 'td',
      },
      attributes: {
        ...defaultTableAttrs,
        ...options.attributes,
      },
    };
  }

  private _parseHTML(html: string): DocumentElement[] {
    const doc = this._domParser.parse(html);
    const content: DocumentElement[] = [];

    doc.body.childNodes.forEach((child) => {
      const key = child.nodeName.toLowerCase();
      const result = this._parseElement(
        child,
        this._tagHandlers.get(key) ?? this._defaultHandler
      );
      // if (result) {
      if (Array.isArray(result)) {
        content.push(...result);
      } else {
        content.push(result);
      }
      // }
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
    // Now just use options.text and options.content (children)
    const text = (options.text ?? undefined) as string | undefined;
    const children = (options.content ?? undefined) as
      | DocumentElement[]
      | ListItemElement[]
      | undefined;

    switch (tag) {
      case 'p':
        return { type: 'paragraph', text, content: children, ...options };
      case 'div':
        return { type: 'fragment', text, content: children, ...options };
      case 'strong':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), fontWeight: 'bold' },
        };
      case 'colgroup':
        return {
          type: 'attribute',
          name: 'colgroup',
          content: children,
          ...options,
        };
      case 'col':
        return {
          type: 'attribute',
          name: 'col',
          content: children,
          ...options,
        };
      case 'em':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), fontStyle: 'italic' },
        };
      case 'small':
        return {
          type: 'text',
          text,
          content: children,
          ...options,
          styles: { ...(options.styles || {}), fontSize: '8px' },
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
      case 'caption':
        return {
          type: 'attribute',
          name: 'caption',
          text,
          content: children,
          ...options,
          styles: {
            fontStyle: 'italic',
            textAlign: 'center',
            ...(options.styles || {}),
          },
        };
      // Description list container
      case 'dl':
        return { type: 'fragment', text, content: children, ...options };
      // Description term
      case 'dt':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
          // default term style: bold
          styles: { ...(options.styles || {}) },
        };
      // Description definition: indented
      case 'dd':
        return {
          type: 'paragraph',
          text,
          content: children,
          ...options,
          // default indent for definitions
          styles: { marginLeft: '40px', ...(options.styles || {}) },
        };

      default:
        return { type: 'custom', text, content: children, ...options };
    }
  }
}
