import { Parser } from '../../core/parser';
import { DocumentElement } from '../../core/types';

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

  it('returns empty array when no handlers registered', () => {
    expect(parser.parse('<p>Hello</p>')).toEqual([]);
  });

  it('parses a single element when handler registered', () => {
    const handler = jest.fn().mockImplementation(
      (el: HTMLElement) =>
        ({
          type: 'paragraph',
          text: el.textContent,
          attributes: {},
        } as DocumentElement)
    );
    parser.registerTagHandler('p', handler);

    const result = parser.parse('<p>Hello World</p>');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { type: 'paragraph', text: 'Hello World', attributes: {} },
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

  it('ignores nested elements without handler for parent', () => {
    const handler = jest.fn().mockReturnValue({
      type: 'custom',
      text: 'inside',
      attributes: {},
    } as DocumentElement);
    parser.registerTagHandler('span', handler);

    const html = '<div><span>inside</span></div>';
    const result = parser.parse(html);
    expect(result).toEqual([]);
    expect(handler).not.toHaveBeenCalled();
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
