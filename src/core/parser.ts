import { DocumentElement, TagHandler } from './types';
import { JSDOM } from 'jsdom';
export function parseElement(
  element: HTMLElement | ChildNode,
  handler: TagHandler
) {
  return handler(element);
}
export function parseHTML(
  html: string,
  handlers: Map<string, TagHandler>
): DocumentElement[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const content: DocumentElement[] = [];

  doc.body.childNodes.forEach((child) => {
    if (handlers.has(child.nodeName))
      content.push(parseElement(child, handlers.get(child.nodeName)!));
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
