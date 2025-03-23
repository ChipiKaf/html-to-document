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
