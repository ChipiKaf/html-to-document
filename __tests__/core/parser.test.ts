import { Parser } from '../../src/core/parser';
import { DocumentElement, ParagraphElement } from '../../src/core/types';
import { minifyMiddleware } from '../../src/middleware/minify.middleware';
import { JSDOMParser } from '../utils/parser.helper';

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser([], new JSDOMParser());
  });

  describe('general', () => {
    it('returns default parsing including styles and attributes for built-in tags', () => {
      const result = parser.parse('<p style="color: red;" id="test">Hello</p>');
      const parsed = result[0] as ParagraphElement;
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
          }) as DocumentElement
      );
      parser.registerTagHandler('p', handler);

      const result = parser.parse(
        '<p style="font-weight:bold" data-custom="x">Hello World</p>'
      );
      expect(handler).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        {
          type: 'paragraph',
          text: 'Hello World',
          styles: { fontWeight: 'bold' },
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
          }) as DocumentElement
      );
      parser.registerTagHandler('p', handler);

      const html = '<p>first</p><p>second</p>';
      const result = parser.parse(html) as ParagraphElement[];
      expect(result.length).toBe(2);
      expect(result[0].text).toBe('first');
      expect(result[1].text).toBe('second');
    });

    it('parses parent as custom element when no handler registered for nested', () => {
      const html = `<div style="margin: 10px" id="wrapper"><span data-custom="x" style="border: 1px solid #fff">inside</span></div>`;
      const result = parser.parse(html);
      expect(result).toEqual([
        {
          type: 'custom',
          content: [
            {
              type: 'text',
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
      const html = `<div style="margin: 10px" id="wrapper">No parent content<span data-custom="x" style="border: 1px solid #fff">inside</span></div>`;
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
              type: 'text',
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
  describe('paragraph', () => {
    it('parses a paragraph with nested styled spans into nested text elements', async () => {
      let html = `<p style="font-weight:bold" data-custom="x">
      <span style="color: red;">Hello
        <span style="color: green;">Green World</span>
      </span>World</p>`;
      html = await minifyMiddleware(html);
      const result = parser.parse(html);

      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              content: [
                {
                  type: 'text',
                  text: 'Hello ',
                },
                {
                  type: 'text',
                  text: 'Green World',
                  styles: {
                    color: 'green',
                  },
                  attributes: {},
                },
              ],
              styles: {
                color: 'red',
              },
              attributes: {},
            },
            {
              type: 'text',
              text: 'World',
            },
          ],
          styles: {
            fontWeight: 'bold',
          },
          attributes: {
            'data-custom': 'x',
          },
        },
      ]);
    });
    it('parses a paragraph with strong children', () => {
      const result = parser.parse(
        '<p>He<strong>llo</strong>w<strong>or</strong>ld</p>'
      );
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'He',
            },
            {
              type: 'text',
              text: 'llo',
              styles: {
                fontWeight: 'bold',
              },
              attributes: {},
            },
            {
              type: 'text',
              text: 'w',
            },
            {
              type: 'text',
              text: 'or',
              styles: {
                fontWeight: 'bold',
              },
              attributes: {},
            },
            {
              type: 'text',
              text: 'ld',
            },
          ],
          styles: {},
          attributes: {},
        },
      ]);
    });

    it('parses a single paragraph element with children content when no handler is registered', () => {
      const result = parser.parse(
        `<p style="font-weight:bold" data-custom="x"><span style="color: red;">Hello</span>World</p>`
      );
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello',
              styles: {
                color: 'red',
              },
              attributes: {},
            },
            {
              type: 'text',
              text: 'World',
            },
          ],
          styles: {
            fontWeight: 'bold',
          },
          attributes: {
            'data-custom': 'x',
          },
        },
      ]);
    });
  });

  describe('heading', () => {
    it('parses a single heading element with children content when no handler is registered', () => {
      const result = parser.parse(
        `<h1 style="font-weight:bold" data-custom="x"><span style="color: red;">Hello</span>World</h1>`
      );
      expect(result).toEqual([
        {
          type: 'heading',
          level: 1,
          content: [
            {
              type: 'text',
              text: 'Hello',
              styles: {
                color: 'red',
              },
              attributes: {},
            },
            {
              type: 'text',
              text: 'World',
            },
          ],
          styles: {
            fontWeight: 'bold',
          },
          attributes: {
            'data-custom': 'x',
          },
        },
      ]);
    });
  });

  describe('anchor', () => {
    it('parses anchor tags as text elements with href attribute', () => {
      const html = `<p>This is a <a href="https://example.com" style="color: blue;">link</a> inside a paragraph.</p>`;
      const result = parser.parse(html);

      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a ',
            },
            {
              type: 'text',
              text: 'link',
              styles: { color: 'blue' },
              attributes: { href: 'https://example.com' },
            },
            {
              type: 'text',
              text: ' inside a paragraph.',
            },
          ],
          styles: {},
          attributes: {},
        },
      ]);
    });
  });

  describe('list', () => {
    it('parses a single unordered list element with list items as children when no handler is registered', async () => {
      let htmlString = `<ul style="font-weight:bold" data-custom="x">
        <li style="color: red;">
        Indent level 0 a
        <ul>
          <li>Indent level 1</li>
          <li>
            <ol>
              <li>Indent level 2 a</li>
              <li>Indent level 2 b</li>
            </ol>
          </li>
        </ul>
        </li>
        <li>
        Indent level 0 b
        </li>
      </ul>`;
      htmlString = await minifyMiddleware(htmlString);
      let result = parser.parse(htmlString);
      result = JSON.parse(JSON.stringify(result));
      expect(result).toEqual([
        {
          type: 'list',
          listType: 'unordered',
          content: [
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'text',
                  text: 'Indent level 0 a ',
                  // @Todo: Fix this rogue matadata entry
                  metadata: { level: '1' },
                },
                {
                  type: 'list',
                  listType: 'unordered',
                  content: [
                    {
                      type: 'list-item',
                      text: 'Indent level 1',
                      level: 1,
                      metadata: {
                        level: '1',
                      },
                      styles: {},
                      attributes: {},
                    },
                    {
                      type: 'list-item',
                      level: 1,
                      content: [
                        {
                          type: 'list',
                          listType: 'ordered',
                          content: [
                            {
                              type: 'list-item',
                              text: 'Indent level 2 a',
                              level: 2,
                              metadata: {
                                level: '2',
                              },
                              styles: {},
                              attributes: {},
                            },
                            {
                              type: 'list-item',
                              text: 'Indent level 2 b',
                              level: 2,
                              metadata: {
                                level: '2',
                              },
                              styles: {},
                              attributes: {},
                            },
                          ],
                          level: 2,
                          metadata: {
                            level: '2',
                          },
                          styles: {},
                          attributes: {},
                        },
                      ],
                      metadata: {
                        level: '1',
                      },
                      styles: {},
                      attributes: {},
                    },
                  ],
                  level: 1,
                  metadata: {
                    level: '1',
                  },
                  styles: {},
                  attributes: {},
                },
              ],
              metadata: {
                level: '0',
              },
              styles: {
                color: 'red',
              },
              attributes: {},
            },
            {
              type: 'list-item',
              text: 'Indent level 0 b',
              level: 0,
              metadata: {
                level: '0',
              },
              styles: {},
              attributes: {},
            },
          ],
          level: 0,
          styles: {
            fontWeight: 'bold',
          },
          attributes: {
            'data-custom': 'x',
          },
          metadata: {
            level: '0',
          },
        },
      ]);
    });

    it('parses a complex list with both ordered and unordered lists nested', async () => {
      let htmlString = `<ul>
      <li style="list-style-type: none;">
      <ol>
      <li>Level 1 a</li>
      <li>Level 1 b
      </li>
      <li>Level 1 c
      <ol>
      <li>Level 2 a
      </li>
      <li>Level 2 b
      <ul>
      <li>Level 3 a</li>
      <li>Level 3 b</li>
      </ul>
      </li>
      </ol>
      </li>
      </ol>
      </li>
      <li>Level 0 a</li>
      </ul>`;
      htmlString = await minifyMiddleware(htmlString);
      let result = parser.parse(htmlString);
      result = JSON.parse(JSON.stringify(result));
      expect(result).toEqual([
        {
          type: 'list',
          listType: 'unordered',
          content: [
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'list',
                  listType: 'ordered',
                  content: [
                    {
                      type: 'list-item',
                      text: 'Level 1 a',
                      level: 1,
                      metadata: {
                        level: '1',
                      },
                      styles: {},
                      attributes: {},
                    },
                    {
                      type: 'list-item',
                      text: 'Level 1 b',
                      level: 1,
                      metadata: {
                        level: '1',
                      },
                      styles: {},
                      attributes: {},
                    },
                    {
                      type: 'list-item',
                      level: 1,
                      content: [
                        {
                          type: 'text',
                          text: 'Level 1 c ',
                          metadata: {
                            level: '2',
                          },
                        },
                        {
                          type: 'list',
                          listType: 'ordered',
                          content: [
                            {
                              type: 'list-item',
                              text: 'Level 2 a',
                              level: 2,
                              metadata: {
                                level: '2',
                              },
                              styles: {},
                              attributes: {},
                            },
                            {
                              type: 'list-item',
                              level: 2,
                              content: [
                                {
                                  type: 'text',
                                  text: 'Level 2 b ',
                                  metadata: {
                                    level: '3',
                                  },
                                },
                                {
                                  type: 'list',
                                  listType: 'unordered',
                                  content: [
                                    {
                                      type: 'list-item',
                                      text: 'Level 3 a',
                                      level: 3,
                                      metadata: {
                                        level: '3',
                                      },
                                      styles: {},
                                      attributes: {},
                                    },
                                    {
                                      type: 'list-item',
                                      text: 'Level 3 b',
                                      level: 3,
                                      metadata: {
                                        level: '3',
                                      },
                                      styles: {},
                                      attributes: {},
                                    },
                                  ],
                                  level: 3,
                                  metadata: {
                                    level: '3',
                                  },
                                  styles: {},
                                  attributes: {},
                                },
                              ],
                              metadata: {
                                level: '2',
                              },
                              styles: {},
                              attributes: {},
                            },
                          ],
                          level: 2,
                          metadata: {
                            level: '2',
                          },
                          styles: {},
                          attributes: {},
                        },
                      ],
                      metadata: {
                        level: '1',
                      },
                      styles: {},
                      attributes: {},
                    },
                  ],
                  level: 1,
                  metadata: {
                    level: '1',
                  },
                  styles: {},
                  attributes: {},
                },
              ],
              metadata: {
                level: '0',
              },
              styles: {
                listStyleType: 'none',
              },
              attributes: {},
            },
            {
              type: 'list-item',
              text: 'Level 0 a',
              level: 0,
              metadata: {
                level: '0',
              },
              styles: {},
              attributes: {},
            },
          ],
          level: 0,
          styles: {},
          attributes: {},
          metadata: {
            level: '0',
          },
        },
      ]);
    });
  });

  describe('table', () => {
    it('parses table and correctly formats its structure', () => {
      const html = `<table style="border-style: dashed" data-table="x">
      <tr style="border-width: 3px">
      <td style="color: red" colspan="3" rowspan="3">Row 1 Cell 1</td>
      <td colspan="1" rowspan="1"><div style="font-family: times-new-roman">Row 1 Cell 2</div></td>
      </tr>
      <tr data-row="x">
      <td colspan="3" rowspan="3">Row 2 Cell 1</td>
      <td colspan="3" rowspan="3">Row 2 Cell 2</td>
      </tr>
      <tr>
      <td>Row 3</td>
      </tr>
      </table>`;
      const result = parser.parse(html);
      expect(result).toEqual([
        {
          type: 'table',
          rows: [
            {
              cells: [
                {
                  type: 'table-cell',
                  content: [{ type: 'text', text: 'Row 1 Cell 1' }],
                  styles: { color: 'red' },
                  attributes: {},
                  colspan: 3,
                  rowspan: 3,
                },
                {
                  type: 'table-cell',
                  content: [
                    {
                      type: 'custom',
                      text: 'Row 1 Cell 2',
                      styles: { fontFamily: 'times-new-roman' },
                      attributes: {},
                    },
                  ],
                  styles: {},
                  attributes: {},
                  colspan: 1,
                  rowspan: 1,
                },
              ],
              styles: { borderWidth: '3px' },
              attributes: {},
            },
            {
              cells: [
                {
                  type: 'table-cell',
                  content: [{ type: 'text', text: 'Row 2 Cell 1' }],
                  styles: {},
                  attributes: {},
                  colspan: 3,
                  rowspan: 3,
                },
                {
                  type: 'table-cell',
                  content: [{ type: 'text', text: 'Row 2 Cell 2' }],
                  styles: {},
                  attributes: {},
                  colspan: 3,
                  rowspan: 3,
                },
              ],
              styles: {},
              attributes: { 'data-row': 'x' },
            },
            {
              cells: [
                {
                  type: 'table-cell',
                  content: [{ type: 'text', text: 'Row 3' }],
                  styles: {},
                  attributes: {},
                  colspan: 1,
                  rowspan: 1,
                },
              ],
              styles: {},
              attributes: {},
            },
          ],
          styles: { borderStyle: 'dashed' },
          attributes: { 'data-table': 'x' },
        },
      ]);
    });
    it('centers the content of a table heading', () => {
      const html = `<table style="border-style: dashed" data-table="x">
      <tr style="border-width: 3px">
      <th style="color: red" colspan="3" rowspan="3">Heading 1</th>
      <th colspan="1" rowspan="1"><div style="font-family: times-new-roman">Heading 2</div></th>
      </tr>
      </table>`;
      const result = parser.parse(html);
      expect(result).toEqual([
        {
          type: 'table',
          rows: [
            {
              cells: [
                {
                  type: 'table-cell',
                  content: [
                    {
                      type: 'text',
                      text: 'Heading 1',
                    },
                  ],
                  styles: {
                    textAlign: 'center',
                    color: 'red',
                  },
                  attributes: {},
                  colspan: 3,
                  rowspan: 3,
                },
                {
                  type: 'table-cell',
                  content: [
                    {
                      type: 'custom',
                      text: 'Heading 2',
                      styles: {
                        fontFamily: 'times-new-roman',
                      },
                      attributes: {},
                    },
                  ],
                  styles: {
                    textAlign: 'center',
                  },
                  attributes: {},
                  colspan: 1,
                  rowspan: 1,
                },
              ],
              styles: {
                borderWidth: '3px',
              },
              attributes: {},
            },
          ],
          styles: {
            borderStyle: 'dashed',
          },
          attributes: {
            'data-table': 'x',
          },
        },
      ]);
    });
  });
  describe('sup tag', () => {
    it('parses sup and sub tags with appropriate verticalAlign styles', () => {
      let result = parser.parse('<p>H<sub>2</sub>O and x<sup>2</sup></p>');
      result = JSON.parse(JSON.stringify(result));
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'H' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'sub' },
              attributes: {},
            },
            { type: 'text', text: 'O and x' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'super' },
              attributes: {},
            },
          ],
          styles: {},
          attributes: {},
        },
      ]);
    });
  });
  describe('line-break', () => {
    it('parses br tags as text elements with break metadata', () => {
      const result = parser.parse('<p>Hello<br>World</p>');
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello',
            },
            {
              styles: {},
              attributes: {},
              content: [],
              text: '',
              type: 'text',
              metadata: {
                break: 1,
              },
            },
            {
              type: 'text',
              text: 'World',
            },
          ],
          styles: {},
          attributes: {},
        },
      ]);
    });
  });
});
