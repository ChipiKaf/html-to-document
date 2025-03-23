import { parseAttributes, parseStyles } from '../utils/html.utils';
import { DocumentElement, TagHandler } from './types';
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
    return this._parseHTML(html, this._tagHandlers);
  }

  private _parseElement(element: HTMLElement | ChildNode, handler: TagHandler) {
    const styles = parseStyles(element);
    const attributes = parseAttributes(element);
    return handler(element, { styles, attributes });
  }

  private _parseHTML(
    html: string,
    handlers: Map<string, TagHandler>
  ): DocumentElement[] {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const content: DocumentElement[] = [];

    doc.body.childNodes.forEach((child) => {
      const key = child.nodeName.toLowerCase();
      content.push(
        this._parseElement(child, handlers.get(key) ?? this._defaultHandler)
      );
    });
    return content;
  }

  private _defaultHandler(
    element: HTMLElement | ChildNode,
    options: any
  ): DocumentElement {
    const tag =
      (element as HTMLElement).tagName?.toLowerCase() ||
      (element as ChildNode).nodeName?.toLowerCase();

    let children: DocumentElement[] | undefined;
    // If we only have text inside, then
    if (
      !(element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)
    )
      children = Array.from(element.childNodes).map((child) => {
        // Change this to have even the custom tag handlers
        const key = child.nodeName.toLowerCase();
        return this._parseElement(
          child,
          this._tagHandlers.get(key) ?? this._defaultHandler
        );
      });
    const text = children === undefined ? element.textContent : undefined;

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
        return { type: 'list', text, content: children, ...options };
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
