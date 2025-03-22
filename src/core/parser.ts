import { DocumentElement, TagHandler } from './types';
import { JSDOM } from 'jsdom';

function defaultHandler(element: HTMLElement | ChildNode): DocumentElement {
  const tag =
    (element as HTMLElement).tagName?.toLowerCase() ||
    (element as ChildNode).nodeName?.toLowerCase();

  switch (tag) {
    case 'p':
      return {
        type: 'paragraph',
        text: element.textContent || '',
        attributes: {},
      };
    case 'h1':
    case 'h2':
    case 'h3':
      return {
        type: 'heading',
        level: Number(tag.slice(1)),
        text: element.textContent || '',
        attributes: {},
      };
    case 'ul':
    case 'ol':
      return { type: 'list', content: [], attributes: {} };
    case 'img':
      return {
        type: 'image',
        src: (element as HTMLImageElement).src,
        attributes: {},
      };
    default:
      return {
        type: 'custom',
        text: element.textContent || '',
        attributes: {},
      };
  }
}

function parseElement(element: HTMLElement | ChildNode, handler: TagHandler) {
  return handler(element);
}
function parseHTML(
  html: string,
  handlers: Map<string, TagHandler>
): DocumentElement[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const content: DocumentElement[] = [];

  doc.body.childNodes.forEach((child) => {
    const key = child.nodeName.toLowerCase();
    content.push(parseElement(child, handlers.get(key) ?? defaultHandler));
  });
  return content;
}

export class Parser {
  private _tagHandlers: Map<string, TagHandler>;
  constructor() {
    this._tagHandlers = new Map();
  }

  public registerTagHandler(tag: string, handler: TagHandler) {
    // They are case insensitive
    this._tagHandlers.set(tag.toLowerCase(), handler);
  }

  parse(html: string) {
    return parseHTML(html, this._tagHandlers);
  }
}
