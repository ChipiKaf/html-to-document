import { Parser } from '../../core/parser';
import { DocumentElement } from '../../core/types';

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

  it('returns default parsing including styles and attributes for built-in tags', () => {
    const result = parser.parse('<p style="color: red;" id="test">Hello</p>');
    const parsed = result[0];
    expect(parsed.type).toBe('paragraph');
    expect(parsed.text).toBe('Hello');
    expect(parsed.styles?.color).toBe('red');
    expect(parsed.attributes!['id']).toBe('test');
  });

  it('parses a single element when handler registered', () => {
    const handler = jest.fn().mockImplementation(
      (el: HTMLElement, options) =>
        ({
          type: 'paragraph',
          text: el.textContent,
          ...options,
        } as DocumentElement)
    );
    parser.registerTagHandler('p', handler);

    const result = parser.parse(
      '<p style="font-weight:bold" data-custom="x">Hello World</p>'
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([
      {
        type: 'paragraph',
        text: 'Hello World',
        styles: { 'font-weight': 'bold' },
        attributes: { 'data-custom': 'x' },
      },
    ]);
  });

  it('is case-insensitive for tag names', () => {
    const handler = jest.fn().mockReturnValue({
      type: 'heading',
      text: 'HELLO',
      attributes: {},
    } as DocumentElement);
    parser.registerTagHandler('h1', handler);

    const result = parser.parse('<H1>HELLO</H1>');
    expect(handler).toHaveBeenCalled();
    expect(result[0].type).toBe('heading');
  });

  it('parses multiple sibling elements', () => {
    const handler = jest.fn().mockImplementation(
      (el: HTMLElement) =>
        ({
          type: 'paragraph',
          text: el.textContent,
          attributes: {},
        } as DocumentElement)
    );
    parser.registerTagHandler('p', handler);

    const html = '<p>first</p><p>second</p>';
    const result = parser.parse(html);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('first');
    expect(result[1].text).toBe('second');
  });

  it('parses parent as custom element when no handler registered for nested', () => {
    const html =
      '<div style="margin: 10px" id="wrapper"><span data-custom="x" style="border: 1px solid #fff">inside</span></div>';
    const result = parser.parse(html);
    expect(result).toEqual([
      {
        type: 'custom',
        content: [
          {
            type: 'custom',
            text: 'inside',
            attributes: { 'data-custom': 'x' },
            styles: { border: '1px solid #fff' },
          },
        ],
        attributes: { id: 'wrapper' },
        styles: { margin: '10px' },
      },
    ]);
    expect(result[0].styles?.margin).toBe('10px');
  });

  it('parses parent as custom element when no handler registered for nested', () => {
    const html =
      '<div style="margin: 10px" id="wrapper">No parent content<span data-custom="x" style="border: 1px solid #fff">inside</span></div>';
    const result = parser.parse(html);
    expect(result).toEqual([
      {
        type: 'custom',
        content: [
          {
            type: 'text',
            text: 'No parent content',
          },
          {
            type: 'custom',
            text: 'inside',
            attributes: { 'data-custom': 'x' },
            styles: { border: '1px solid #fff' },
          },
        ],
        attributes: { id: 'wrapper' },
        styles: { margin: '10px' },
      },
    ]);
  });

  it('handles malformed HTML gracefully', () => {
    const handler = jest.fn().mockReturnValue({
      type: 'paragraph',
      text: 'broken',
      attributes: {},
    } as DocumentElement);
    parser.registerTagHandler('p', handler);

    const result = parser.parse('<p>unclosed');
    expect(result.length).toBe(1);
  });
});
