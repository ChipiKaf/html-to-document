import {
  createBaseStylesheet,
  Parser,
  type TableCellElement,
  type TableRowElement,
} from 'html-to-document-core';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  JSDOMParser,
  parseDocxDocument,
} from '../../../core/__tests__/utils/parser.helper';
import { DocxAdapter } from '../src/docx.adapter';
import { TableGrid } from '../src/element-converters/block/table/grid';

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

/** Collects the text of every run in a `w:tc`. */
const getCellText = (tc: any): string =>
  toArray(tc['w:p'])
    .flatMap((p: any) => toArray(p['w:r']))
    .map((r: any) => r['w:t']?.['#text'] ?? '')
    .join('');

/**
 * Describes a row's `w:tc` elements: a cell's text, followed by `(span N)` when
 * it spans columns and `[restart]`/`[continue]` when it is vertically merged.
 */
const describeRows = (tbl: any): string[][] =>
  toArray(tbl['w:tr']).map((tr: any) =>
    toArray(tr['w:tc']).map((tc: any) => {
      const gridSpan = tc['w:tcPr']?.['w:gridSpan']?.['@_w:val'];
      const vMerge = tc['w:tcPr']?.['w:vMerge'];
      return [
        getCellText(tc),
        gridSpan ? `(span ${gridSpan})` : '',
        vMerge ? `[${vMerge['@_w:val'] ?? 'continue'}]` : '',
      ]
        .filter(Boolean)
        .join(' ');
    })
  );

/**
 * Describes the `w:tcBorders` of each `w:tc`, row by row, as the `w:val` of its
 * top, right, bottom and left sides, or `-` for a side it doesn't write.
 */
const describeBorders = (tbl: any): string[][] =>
  toArray(tbl['w:tr']).map((tr: any) =>
    toArray(tr['w:tc']).map((tc: any) => {
      const borders = tc['w:tcPr']?.['w:tcBorders'];
      return ['w:top', 'w:right', 'w:bottom', 'w:left']
        .map((side) => borders?.[side]?.['@_w:val'] ?? '-')
        .join(' ');
    })
  );

const convertTable = async (
  html: string,
  adapter = new DocxAdapter({})
): Promise<any> => {
  const elements = new Parser([], new JSDOMParser()).parse(html);
  const buffer = await adapter.convert(elements);
  const body = (await parseDocxDocument(buffer))['w:document']['w:body'];
  return toArray(body['w:tbl'])[0];
};

type OrderedNode = Record<string, unknown>;

/** Collects the text of an element parsed with `preserveOrder`. */
const getOrderedText = (nodes: OrderedNode[]): string =>
  nodes
    .map((node) =>
      '#text' in node
        ? String(node['#text'])
        : Object.entries(node)
            .filter(([key]) => key !== ':@')
            .map(([, children]) => getOrderedText(children as OrderedNode[]))
            .join('')
    )
    .join('');

/**
 * Describes the document body in order: `<table>` for a table, and a
 * paragraph's text for a paragraph.
 */
const describeBody = async (html: string): Promise<string[]> => {
  const elements = new Parser([], new JSDOMParser()).parse(html);
  const buffer = await new DocxAdapter({}).convert(elements);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('text');
  const [document] = new XMLParser({ preserveOrder: true })
    .parse(xml)
    .filter((node: OrderedNode) => 'w:document' in node);
  const [body] = document['w:document'] as OrderedNode[];

  return (body!['w:body'] as OrderedNode[]).flatMap((node) => {
    if ('w:tbl' in node) return ['<table>'];
    if ('w:p' in node) return [getOrderedText(node['w:p'] as OrderedNode[])];
    return [];
  });
};

const cell = (
  text: string,
  spans: Pick<TableCellElement, 'colspan' | 'rowspan'> = {}
): TableCellElement => ({
  type: 'table-cell',
  content: [{ type: 'text', text }],
  ...spans,
});

const row = (...cells: TableCellElement[]): TableRowElement => ({
  type: 'table-row',
  cells,
});

/** Draws the grid as rows of the text of the cell covering each slot, `.` when none. */
const drawGrid = (grid: TableGrid): string[] =>
  Array.from({ length: grid.rowCount }, (_, r) =>
    Array.from({ length: grid.colCount }, (_, c) => {
      const content = grid.at(r, c)?.cell.content?.[0];
      return content && 'text' in content ? content.text : '.';
    }).join(' ')
  );

describe('TableGrid', () => {
  it('covers colspan × rowspan slots with each cell', () => {
    const grid = new TableGrid([
      row(cell('A', { colspan: 2, rowspan: 2 }), cell('B')),
      row(cell('C')),
      row(cell('D'), cell('E'), cell('F')),
    ]);

    expect(drawGrid(grid)).toEqual(['A A B', 'A A C', 'D E F']);
  });

  it('pushes the cells of a spanned row past a spanning cell that is not in the first column', () => {
    const grid = new TableGrid([
      row(cell('X'), cell('A', { colspan: 2, rowspan: 2 }), cell('Z')),
      row(cell('Y'), cell('W')),
    ]);

    expect(drawGrid(grid)).toEqual(['X A A Z', 'Y A A W']);
  });

  it('grows as wide as the widest row, counting the slots spanned from above', () => {
    const grid = new TableGrid([
      row(cell('A', { rowspan: 2 }), cell('B')),
      row(cell('C'), cell('D')),
    ]);

    expect(grid.colCount).toBe(3);
    expect(drawGrid(grid)).toEqual(['A B .', 'A C D']);
  });

  it('cuts a rowspan off at the last row of the table', () => {
    const grid = new TableGrid([row(cell('A'), cell('B', { rowspan: 3 }))]);

    expect(grid.rowCount).toBe(1);
    expect(grid.cells[1]?.rowSpan).toBe(1);
  });

  it('treats missing, zero and negative spans as 1', () => {
    const grid = new TableGrid([
      row(cell('A', { colspan: 0, rowspan: -1 }), cell('B')),
    ]);

    expect(drawGrid(grid)).toEqual(['A B']);
  });

  it('keeps the slots of the earlier cell when cells overlap', () => {
    const grid = new TableGrid([
      row(cell('A'), cell('B', { rowspan: 2 })),
      row(cell('C', { colspan: 2 })),
    ]);

    expect(drawGrid(grid)).toEqual(['A B', 'C B']);
  });

  describe('getRowSlots', () => {
    it('lists the start, continuation and empty slots of a row, skipping spanned columns', () => {
      const grid = new TableGrid([
        row(cell('A', { colspan: 2, rowspan: 2 }), cell('B')),
        row(),
      ]);

      expect(
        grid.getRowSlots(0).map(({ kind, col }) => `${kind}@${col}`)
      ).toEqual(['start@0', 'start@2']);
      expect(
        grid.getRowSlots(1).map(({ kind, col }) => `${kind}@${col}`)
      ).toEqual(['continuation@0', 'empty@2']);
    });
  });
});

describe('TableConverter', () => {
  describe('cells spanning both rows and columns', () => {
    // A cell with rowspan and colspan covers every column it spans in each row it
    // spans, as in the HTML table model, so the next cell in a spanned row starts
    // after the spanned columns.
    it('places the cells of a spanned row after all the spanned columns', async () => {
      const tbl = await convertTable(`<table>
        <tr><td colspan="2" rowspan="2">A</td><td>B</td></tr>
        <tr><td>C</td></tr>
        <tr><td>D</td><td>E</td><td>F</td></tr>
      </table>`);

      expect(describeRows(tbl)).toEqual([
        ['A (span 2) [restart]', 'B'],
        ['(span 2) [continue]', 'C'],
        ['D', 'E', 'F'],
      ]);
    });

    it('places the cells of a spanned row around a spanning cell that is not in the first column', async () => {
      const tbl = await convertTable(`<table>
        <tr><td>X</td><td colspan="2" rowspan="2">A</td><td>Z</td></tr>
        <tr><td>Y</td><td>W</td></tr>
        <tr><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      </table>`);

      expect(describeRows(tbl)).toEqual([
        ['X', 'A (span 2) [restart]', 'Z'],
        ['Y', '(span 2) [continue]', 'W'],
        ['1', '2', '3', '4'],
      ]);
    });
  });

  it('keeps the cells of a row that is wider than every row because of a rowspan', async () => {
    const tbl = await convertTable(`<table>
      <tr><td rowspan="2">A</td><td>B</td></tr>
      <tr><td>C</td><td>D</td></tr>
    </table>`);

    expect(describeRows(tbl)).toEqual([
      ['A [restart]', 'B', ''],
      ['[continue]', 'C', 'D'],
    ]);
  });

  describe('captions', () => {
    it('writes captions above or below the table by their caption-side', async () => {
      const body = await describeBody(`<table>
        <caption>Above</caption>
        <caption style="caption-side: bottom">Below</caption>
        <tr><td>A</td></tr>
      </table>`);

      expect(body).toEqual(['Above', '<table>', 'Below']);
    });

    // As in HTML, where a table without rows still shows its caption. Only the
    // table is left out, since Word can't open a table without rows.
    it('keeps the captions of a table without rows', async () => {
      const body = await describeBody(`<table>
        <caption>Above</caption>
        <caption style="caption-side: bottom">Below</caption>
      </table>`);

      expect(body).toEqual(['Above', 'Below']);
    });
  });

  it('does not merge a cell whose rowspan reaches past the last row', async () => {
    const tbl = await convertTable(`<table>
      <tr><td rowspan="3" style="border: 1px solid #000">A</td><td>B</td></tr>
    </table>`);

    expect(describeRows(tbl)).toEqual([['A', 'B']]);
    expect(describeBorders(tbl)[0]?.[0]).toBe('single single single single');
  });

  it('resolves cell styles from the default styles, then the style sheet, then inline styles', async () => {
    const stylesheet = createBaseStylesheet();
    stylesheet.addRule('td', { backgroundColor: '#00FF00' });
    const adapter = new DocxAdapter({
      stylesheet,
      defaultStyles: {
        'table-cell': { backgroundColor: '#FF0000', textAlign: 'center' },
      },
    });

    const tbl = await convertTable(
      `<table><tr><td>Style sheet</td><td style="background-color: #0000FF">Inline</td></tr></table>`,
      adapter
    );
    const [fromStylesheet, inline] = toArray(toArray(tbl['w:tr'])[0]['w:tc']);

    expect(fromStylesheet['w:tcPr']['w:shd']['@_w:fill']).toBe('00FF00');
    expect(inline['w:tcPr']['w:shd']['@_w:fill']).toBe('0000FF');
    // A default style that no rule overrides still applies to the content
    expect(toArray(fromStylesheet['w:p'])[0]['w:pPr']['w:jc']['@_w:val']).toBe(
      'center'
    );
  });

  // Word draws each row of a vertically merged cell as its own w:tc, and a
  // cell's borders along the table's edge separately from the table's. These
  // tests follow the CSS collapsed border model, where `hidden` on either side
  // of an edge wins over every other border and `none` loses to any border.
  describe('collapsed borders', () => {
    const solid = 'border: 1px solid #000';

    it('has no border between the rows a cell spans', async () => {
      const tbl = await convertTable(`<table>
        <tr><td rowspan="3" style="${solid}">A</td><td>B</td></tr>
        <tr><td>C</td></tr>
        <tr><td>D</td></tr>
      </table>`);

      expect(describeBorders(tbl).map((cells) => cells[0])).toEqual([
        'single single none single',
        'none single none single',
        'none single single single',
      ]);
    });

    it('suppresses the side of a merged cell next to a hidden border, only in that row', async () => {
      const tbl = await convertTable(`<table>
        <tr><td rowspan="2" style="${solid}">A</td><td style="border-left-style: none">B</td></tr>
        <tr><td style="border-left-style: hidden">C</td></tr>
      </table>`);

      expect(describeBorders(tbl).map((cells) => cells[0])).toEqual([
        // B's none loses to A's solid border
        'single single none single',
        // C's hidden wins over it
        'none none single single',
      ]);
    });

    it('suppresses the bottom of a merged cell when the cell below its last row is hidden', async () => {
      const tbl = await convertTable(`<table>
        <tr><td rowspan="2" style="${solid}">A</td><td>B</td></tr>
        <tr><td>C</td></tr>
        <tr><td style="border-top-style: hidden">D</td><td>E</td></tr>
      </table>`);

      expect(describeBorders(tbl)[1]?.[0]).toBe('none single none single');
    });

    it('suppresses the side of a cell spanning columns when a neighbour along part of it is hidden', async () => {
      const tbl = await convertTable(`<table>
        <tr><td>A</td><td style="border-bottom-style: hidden">B</td></tr>
        <tr><td colspan="2" style="${solid}">C</td></tr>
        <tr><td style="border-top-style: none">D</td><td>E</td></tr>
      </table>`);

      expect(describeBorders(tbl)[1]?.[0]).toBe('none single single single');
    });

    it('suppresses the sides of a neighbour of a cell that spans rows and columns', async () => {
      const tbl = await convertTable(`<table>
        <tr><td colspan="2" rowspan="2" style="border-style: hidden">A</td><td style="${solid}">B</td></tr>
        <tr><td style="${solid}">C</td></tr>
        <tr><td style="${solid}">D</td><td style="${solid}">E</td><td style="${solid}">F</td></tr>
      </table>`);
      const borders = describeBorders(tbl);

      // B and C lose their left side, D and E their top
      expect(borders[0]?.[1]).toBe('single single single none');
      expect(borders[1]?.[1]).toBe('single single single none');
      expect(borders[2]).toEqual([
        'none single single single',
        'none single single single',
        'single single single single',
      ]);
    });

    it("suppresses the cells' sides along a table border that is hidden, but not one that is none", async () => {
      const html = (tableStyle: string) => `<table style="${tableStyle}">
        <tr><td style="${solid}">A</td><td style="${solid}">B</td></tr>
      </table>`;

      expect(
        describeBorders(await convertTable(html('border-style: hidden')))
      ).toEqual([['none single none none', 'none none none single']]);
      expect(
        describeBorders(await convertTable(html('border-style: none')))
      ).toEqual([
        ['single single single single', 'single single single single'],
      ]);
    });
  });
});
