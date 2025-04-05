import { parseAttributes, parseStyles } from '../utils/html.utils';
import {
  DocumentElement,
  TableCellElement,
  TableRowElement,
  TagHandler,
} from './types';
import { JSDOM } from 'jsdom';

// @ToDo: Handle passing of options for tag handlers and maybe Middleware
export class Parser {
  private _tagHandlers: Map<string, TagHandler>;
  constructor() {
    this._tagHandlers = new Map();
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
    options: { [key: string]: any } = {}
  ) {
    let styles = parseStyles(element);
    let attributes = parseAttributes(element);
    if (options.attributes) {
      attributes = { ...options.attributes, ...attributes };
    }
    if (options.styles) {
      styles = { ...options.styles, ...styles };
    }
    return handler(element, { ...options, ...{ styles, attributes } });
  }

  private _parseTable(
    element: HTMLElement | ChildNode,
    options = {}
  ): DocumentElement {
    const rows: TableRowElement[] = [];
    // Query all trs (Perhaps we lose the styles of thead, tbody and tfooter so we need to fix this)
    const trElements = (element as Element).querySelectorAll('tr');
    trElements.forEach((tr) => {
      const cells: TableCellElement[] = [];
      const styles = parseStyles(tr);
      const attributes = parseAttributes(tr);
      tr.querySelectorAll('td, th').forEach((cell) => {
        const styles = parseStyles(cell);
        const attributes = parseAttributes(cell);
        const content = this._parseHTML(cell.innerHTML);
        const cellElement: TableCellElement = {
          type: 'table-cell',
          content,
          styles,
          attributes,
          colspan: cell.getAttribute('colspan')
            ? Number(cell.getAttribute('colspan'))
            : 1,
          rowspan: cell.getAttribute('rowspan')
            ? Number(cell.getAttribute('rowspan'))
            : 1,
        };
        cells.push(cellElement);
      });
      rows.push({ cells, styles, attributes });
    });

    return {
      type: 'table',
      rows,
      ...options,
    };
  }

  private _parseHTML(html: string): DocumentElement[] {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
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
    options: any
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
    let children: DocumentElement[] | undefined;
    // If we only have text inside, then
    if (
      !(element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)
    ) {
      const tag = element.nodeName.toLowerCase();
      const isList = tag === 'ul' || tag === 'ol' || tag === 'li';
      const newLevel =
        options &&
        options.metadata &&
        typeof options.metadata.level !== 'undefined'
          ? tag === 'li'
            ? (parseInt(options.metadata.level) + 1).toString()
            : options.metadata.level
          : '0';

      children = Array.from(element.childNodes).map((child) => {
        // Change this to have even the custom tag handlers
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
    const text =
      children === undefined
        ? element.textContent
          ? element.textContent
          : undefined
        : undefined;

    switch (tag) {
      case 'p':
        return {
          type: 'paragraph',
          text,
          content: children,
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
                : options.metadata.level
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
                : options.metadata.level
              : 0,
          content: children,
          ...options,
        };
      // @Todo: THink about even more nesting (Generally think about how to handle inline vs block)
      // Perhaps do the recursive thing with text as well, such that it returns multiple text runs
      case 'span':
        return {
          type: 'text',
          text: text,
          content: children,
          ...options,
        };
      case 'img':
        return {
          type: 'image',
          src: (element as HTMLImageElement).src,
          ...options,
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
