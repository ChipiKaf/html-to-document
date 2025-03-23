import { DocumentElement, TagHandler } from '../core';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
const DOMElement = window.Element;

export function parseStyles(element: any): Record<string, string> {
  const styleString = element.getAttribute('style');
  const styles: Record<string, string> = {};
  if (styleString) {
    styleString.split(';').forEach((rule: any) => {
      const [prop, value] = rule.split(':');
      if (prop && value) {
        styles[prop.trim()] = value.trim();
      }
    });
  }
  return styles;
}

export function parseAttributes(element: any): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from((element as HTMLElement).attributes)) {
    if (attr.name === 'style') continue;
    attributes[attr.name] = attr.value;
  }
  return attributes;
}

export function defaultHandler(
  element: HTMLElement | ChildNode,
  options: any
): DocumentElement {
  const tag =
    (element as HTMLElement).tagName?.toLowerCase() ||
    (element as ChildNode).nodeName?.toLowerCase();

  switch (tag) {
    case 'p':
      return {
        type: 'paragraph',
        text: element.textContent || '',
        ...options,
      };
    case 'h1':
    case 'h2':
    case 'h3':
      return {
        type: 'heading',
        level: Number(tag.slice(1)),
        text: element.textContent || '',
        ...options,
      };
    case 'ul':
    case 'ol':
      return { type: 'list', content: [], ...options };
    case 'img':
      return {
        type: 'image',
        src: (element as HTMLImageElement).src,
        ...options,
      };
    default:
      return {
        type: 'custom',
        text: element.textContent || '',
        ...options,
      };
  }
}

export function parseElement(
  element: HTMLElement | ChildNode,
  handler: TagHandler
) {
  const styles = parseStyles(element);
  const attributes = parseAttributes(element);
  return handler(element, { styles, attributes });
}

export function parseHTML(
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
