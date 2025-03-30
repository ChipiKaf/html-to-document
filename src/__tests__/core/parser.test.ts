import { Parser } from '../../core/parser';
import { DocumentElement, ParagraphElement } from '../../core/types';
import { minifyMiddleware } from '../../middleware/minify.middleware';

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

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

  it('parses a single paragraph element with children content when no handler is registered', () => {
    const result = parser.parse(
      `<p style="font-weight:bold" data-custom="x"><span style="color: red;">Hello</span>World</p>`
    );
    expect(result).toEqual([
      {
        type: 'paragraph',
        content: [
          {
            type: 'custom',
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
          'font-weight': 'bold',
        },
        attributes: {
          'data-custom': 'x',
        },
      },
    ]);
  });

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
            type: 'custom',
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
          'font-weight': 'bold',
        },
        attributes: {
          'data-custom': 'x',
        },
      },
    ]);
  });

  it('parses a single unordered list element with list items as children when no handler is registered', async () => {
    let htmlString = `<ul style="font-weight:bold" data-custom="x">
        <li style="color: red;">
        Indent level 1 a
        <ul>
          <li>Indent level 2</li>
          <li>
            <ol>
              <li>Indent level 3 a</li>
              <li>Indent level 3 b</li>
            </ol>
          </li>
        </ul>
        </li>
        <li>
        Indent level 1 b
        </li>
      </ul>`;
    htmlString = await minifyMiddleware(htmlString);
    const result = parser.parse(htmlString);
    expect(result).toEqual([
      {
        type: 'list',
        listType: 'unordered',
        content: [
          {
            type: 'list-item',
            level: 1,
            content: [
              {
                type: 'text',
                text: 'Indent level 1 a',
              },
              {
                type: 'list',
                listType: 'unordered',
                content: [
                  {
                    type: 'list-item',
                    text: 'Indent level 2',
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
                        type: 'list',
                        listType: 'ordered',
                        content: [
                          {
                            type: 'list-item',
                            text: 'Indent level 3 a',
                            level: 3,
                            metadata: {
                              level: '3',
                            },
                            styles: {},
                            attributes: {},
                          },
                          {
                            type: 'list-item',
                            text: 'Indent level 3 b',
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
            styles: {
              color: 'red',
            },
            attributes: {},
          },
          {
            type: 'list-item',
            text: 'Indent level 1 b',
            level: 1,
            metadata: {
              level: '1',
            },
            styles: {},
            attributes: {},
          },
        ],
        level: 1,
        styles: {
          'font-weight': 'bold',
        },
        attributes: {
          'data-custom': 'x',
        },
        metadata: {
          level: '1',
        },
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
                    styles: { 'font-family': 'times-new-roman' },
                    attributes: {},
                  },
                ],
                styles: {},
                attributes: {},
                colspan: 1,
                rowspan: 1,
              },
            ],
            styles: { 'border-width': '3px' },
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
        styles: { 'border-style': 'dashed' },
        attributes: { 'data-table': 'x' },
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
