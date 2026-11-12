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

/**
 * Describes the `w:tcW` of each `w:tc`, row by row, as its `w:w` and `w:type`,
 * or `-` for a cell without a width.
 */
const describeWidths = (tbl: any): string[][] =>
  toArray(tbl['w:tr']).map((tr: any) =>
    toArray(tr['w:tc']).map((tc: any) => {
      const width = tc['w:tcPr']?.['w:tcW'];
      return width ? `${width['@_w:w']} ${width['@_w:type']}` : '-';
    })
  );

/** The `w:w` of each `w:gridCol` of a table's grid. */
const describeGrid = (tbl: any): string[] =>
  toArray(tbl['w:tblGrid']['w:gridCol']).map((col: any) =>
    String(col['@_w:w'])
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

  describe('column widths', () => {
    const withPageRule = (descriptors: Record<string, string>) => {
      const stylesheet = createBaseStylesheet();
      stylesheet.addAtRule({ kind: 'at-rule', name: 'page', descriptors });
      return new DocxAdapter({ stylesheet });
    };

    it('writes the widths of the <col> elements as the grid', async () => {
      const tbl = await convertTable(`<table>
        <colgroup><col style="width: 2cm"><col style="width: 1cm"><col style="width: 3cm"></colgroup>
        <tr><td colspan="2">A</td><td>B</td></tr>
      </table>`);

      // 2cm, 1cm and 3cm are 1134, 567 and 1701 twips
      expect(describeGrid(tbl)).toEqual(['1134', '567', '1701']);
    });

    it("resolves percentage columns against the table's width", async () => {
      const tbl = await convertTable(`<table style="width: 10cm">
        <colgroup><col style="width: 47.5%"><col style="width: 5%"><col style="width: 47.5%"></colgroup>
        <tr><td>A</td><td>B</td><td>C</td></tr>
      </table>`);

      // 10cm is 5669 twips
      expect(describeGrid(tbl)).toEqual(['2693', '283', '2693']);
    });

    it("resolves a percentage table against the page's width between its @page margins", async () => {
      const adapter = withPageRule({ margin: '2.5cm 4.5cm 2.5cm 2.5cm' });
      const tbl = await convertTable(
        `<table style="width: 100%">
          <colgroup><col style="width: 47.5%"><col style="width: 5%"><col style="width: 47.5%"></colgroup>
          <tr><td>A</td><td>B</td><td>C</td></tr>
        </table>`,
        adapter
      );

      // An A4 page is 11906 twips wide, and its margins are 1417 and 2551
      expect(describeGrid(tbl)).toEqual(['3771', '397', '3771']);
    });

    it('resolves against the width of a landscape page', async () => {
      const adapter = withPageRule({ size: 'A4 landscape', margin: '1in' });
      const tbl = await convertTable(
        `<table style="width: 50%">
          <colgroup><col style="width: 100%"></colgroup>
          <tr><td>A</td></tr>
        </table>`,
        adapter
      );

      // A landscape A4 page is 16838 twips wide, and its margins are 1440
      expect(describeGrid(tbl)).toEqual(['6979']);
    });

    it("resolves the columns of a table without a width against the page's width between the section's margins", async () => {
      const adapter = new DocxAdapter(
        {},
        {
          defaultSectionOptions: {
            properties: { page: { margin: { left: 1453, right: 1453 } } },
          },
        }
      );
      const tbl = await convertTable(
        `<table>
          <colgroup><col style="width: 25%"><col style="width: 75%"></colgroup>
          <tr><td>A</td><td>B</td></tr>
        </table>`,
        adapter
      );

      expect(describeGrid(tbl)).toEqual(['2250', '6750']);
    });

    // As in CSS, where a percentage resolves against the width of its
    // container's content. A column's width includes the padding of its cells,
    // as does a cell's percentage width, which sets its column's width, but a
    // cell's absolute width is the width of its content, unless the cell has
    // `box-sizing: border-box`. 1px is 15 twips.
    describe('nested tables', () => {
      const getNestedGrid = async (cell: string) => {
        const tbl = await convertTable(`<table style="width: 800px">
          <colgroup><col style="width: 25%"><col style="width: 75%"></colgroup>
          <tr><td>A</td>${cell.replace(
            '><',
            `><table style="width: 50%">
              <colgroup><col style="width: 40%"><col style="width: 60%"></colgroup>
              <tr><td>B</td><td>C</td></tr>
            </table><`
          )}</tr>
        </table>`);
        const nested = toArray(toArray(tbl['w:tr'])[0]['w:tc'])[1]['w:tbl'];
        return describeGrid(nested);
      };

      it('resolves against the columns its cell spans, without the padding', async () => {
        // 75% of 12000 twips, without 2 × 150 twips of padding, is 8700
        expect(
          await getNestedGrid('<td style="padding: 0 10px"></td>')
        ).toEqual(['1740', '2610']);
      });

      it("resolves against its column's share of the rest of the table", async () => {
        const tbl = await convertTable(`<table style="width: 800px">
          <colgroup><col style="width: 25%"><col></colgroup>
          <tr><td>A</td><td><table style="width: 50%">
            <colgroup><col style="width: 40%"><col style="width: 60%"></colgroup>
            <tr><td>B</td><td>C</td></tr>
          </table></td></tr>
        </table>`);
        const nested = toArray(toArray(tbl['w:tr'])[0]['w:tc'])[1]['w:tbl'];

        // The second column is the other 75% of 12000 twips
        expect(describeGrid(nested)).toEqual(['1800', '2700']);
      });

      it("resolves against its cell's percentage width, without the padding", async () => {
        expect(
          await getNestedGrid('<td style="width: 75%; padding: 0 10px"></td>')
        ).toEqual(['1740', '2610']);
      });

      it("resolves against its cell's absolute width, which doesn't include the padding", async () => {
        // 400px is 6000 twips
        expect(
          await getNestedGrid('<td style="width: 400px; padding: 0 10px"></td>')
        ).toEqual(['1200', '1800']);
      });

      it("resolves against its cell's absolute width without the padding, when the cell's box-sizing is border-box", async () => {
        expect(
          await getNestedGrid(
            '<td style="width: 400px; padding: 0 10px; box-sizing: border-box"></td>'
          )
        ).toEqual(['1140', '1710']);
      });
    });

    // As in CSS's fixed table layout. The automatic layout would size them by
    // their content, which can't be measured here.
    it("splits the rest of the table's width among the columns without a width", async () => {
      const missingWidth = await convertTable(`<table style="width: 800px">
        <colgroup><col style="width: 200px"><col><col></colgroup>
        <tr><td>A</td><td>B</td><td>C</td></tr>
      </table>`);
      const missingCol = await convertTable(`<table>
        <colgroup><col style="width: 2cm"></colgroup>
        <tr><td>A</td><td>B</td></tr>
      </table>`);

      // 800px is 12000 twips, and 200px 3000
      expect(describeGrid(missingWidth)).toEqual(['3000', '4500', '4500']);
      // A table without a width is at most as wide as the page's content, which
      // is 9026 twips with the default page, and 2cm is 1134
      expect(describeGrid(missingCol)).toEqual(['1134', '7892']);
    });

    // Where the placeholders give equal columns
    it('leaves the grid to docx when no column has a width, or the others leave none for it', async () => {
      const noWidths = await convertTable(`<table>
        <colgroup><col><col></colgroup>
        <tr><td>A</td><td>B</td></tr>
      </table>`);
      const noneLeft = await convertTable(`<table style="width: 10cm">
        <colgroup><col style="width: 100%"><col></colgroup>
        <tr><td>A</td><td>B</td></tr>
      </table>`);

      expect(describeGrid(noWidths)).toEqual(['100', '100']);
      expect(describeGrid(noneLeft)).toEqual(['100', '100']);
    });
  });

  // Word lays a table out by its cells' widths, and only uses the grid when they
  // have none. A percentage of the table keeps a cell resizing with the table,
  // and the table with the page.
  describe('cell widths', () => {
    it('gives a cell the widths of the columns it spans added together, as a percentage when they all are', async () => {
      const tbl = await convertTable(`<table style="width: 10cm">
        <colgroup>
          <col style="width: 40%"><col style="width: 10%"><col style="width: 50%">
          <col style="width: 2cm"><col style="width: 1cm">
        </colgroup>
        <tr><td colspan="2">A</td><td>B</td><td colspan="2">C</td></tr>
        <tr><td>D</td><td colspan="2">E</td><td>F</td><td>G</td></tr>
        <tr><td>H</td><td>I</td><td colspan="2">J</td><td>K</td></tr>
      </table>`);

      // 2cm and 1cm are 1134 and 567 twips, and 3cm is 1701. A percentage and an
      // absolute width add up in twips: 50% of 10cm is 2835, and 2cm 1134.
      expect(describeWidths(tbl)).toEqual([
        ['50% pct', '50% pct', '1701 dxa'],
        ['40% pct', '60% pct', '1134 dxa', '567 dxa'],
        ['40% pct', '10% pct', '3969 dxa', '567 dxa'],
      ]);
    });

    it('gives a cell spanning rows and columns the widths of the columns it spans in every row', async () => {
      const tbl = await convertTable(`<table>
        <colgroup><col style="width: 20%"><col style="width: 30%"><col style="width: 50%"></colgroup>
        <tr><td colspan="2" rowspan="2">A</td><td>B</td></tr>
        <tr><td>C</td></tr>
      </table>`);

      expect(describeWidths(tbl)).toEqual([
        ['50% pct', '50% pct'],
        ['50% pct', '50% pct'],
      ]);
    });

    // As in CSS's fixed table layout, the columns without a width split the rest
    // of the table's width evenly
    it('gives a cell in a column without a width its share of the rest of the table', async () => {
      const percentages = await convertTable(`<table>
        <colgroup><col style="width: 40%"><col><col></colgroup>
        <tr><td>A</td><td>B</td><td>C</td></tr>
        <tr><td colspan="2">D</td><td>E</td></tr>
      </table>`);
      const absolute = await convertTable(`<table style="width: 800px">
        <colgroup><col style="width: 200px"><col><col></colgroup>
        <tr><td>A</td><td>B</td><td>C</td></tr>
      </table>`);

      // The share stays a percentage when the other columns are percentages
      expect(describeWidths(percentages)).toEqual([
        ['40% pct', '30% pct', '30% pct'],
        ['70% pct', '30% pct'],
      ]);
      // 800px is 12000 twips, and 200px 3000
      expect(describeWidths(absolute)).toEqual([
        ['3000 dxa', '4500 dxa', '4500 dxa'],
      ]);
    });

    it('leaves out the width of a cell in a column without a width when no column has one, or the others leave none for it', async () => {
      const noWidths = await convertTable(`<table>
        <colgroup><col><col></colgroup>
        <tr><td>A</td><td>B</td></tr>
      </table>`);
      const noneLeft = await convertTable(`<table>
        <colgroup><col style="width: 100%"><col></colgroup>
        <tr><td colspan="2">A</td></tr>
        <tr><td>B</td><td>C</td></tr>
      </table>`);

      expect(describeWidths(noWidths)).toEqual([['-', '-']]);
      expect(describeWidths(noneLeft)).toEqual([['-'], ['100% pct', '-']]);
    });

    it("keeps a cell's own width over the widths of the columns it spans", async () => {
      const tbl = await convertTable(`<table>
        <colgroup><col style="width: 40%"><col style="width: 60%"></colgroup>
        <tr><td colspan="2" style="width: 3cm">A</td></tr>
      </table>`);

      expect(describeWidths(tbl)).toEqual([['1701 dxa']]);
    });
  });

  // Word puts a table's indent at its left border, as CSS does its margin, since
  // the document is in Word 2013's compatibility mode
  describe('indent', () => {
    /** The table's `w:tblInd`, as its `w:w` and `w:type`, or `-` without one. */
    const describeIndent = (tbl: any): string => {
      const indent = tbl['w:tblPr']['w:tblInd'];
      return indent ? `${indent['@_w:w']} ${indent['@_w:type']}` : '-';
    };

    it('indents a table by its margin-left', async () => {
      const longhand = await convertTable(
        '<table style="margin-left: 1cm"><tr><td>A</td></tr></table>'
      );
      const shorthand = await convertTable(
        '<table style="margin: 0 0 0 2cm"><tr><td>A</td></tr></table>'
      );
      const none = await convertTable('<table><tr><td>A</td></tr></table>');

      // 1cm is 567 twips, and 2cm 1134
      expect(describeIndent(longhand)).toBe('567 dxa');
      expect(describeIndent(shorthand)).toBe('1134 dxa');
      expect(describeIndent(none)).toBe('-');
    });

    it("resolves a percentage against the page's width between its @page margins", async () => {
      const stylesheet = createBaseStylesheet();
      stylesheet.addAtRule({
        kind: 'at-rule',
        name: 'page',
        descriptors: { margin: '2.5cm 4.5cm 2.5cm 2.5cm' },
      });
      const tbl = await convertTable(
        '<table style="width: 100%; margin-left: 10%"><tr><td>A</td></tr></table>',
        new DocxAdapter({ stylesheet })
      );

      // 10% of 21cm - 2.5cm - 4.5cm is 1.4cm
      expect(describeIndent(tbl)).toBe('794 dxa');
    });

    it('resolves the percentage of a nested table against the width of its cell', async () => {
      const tbl = await convertTable(`<table style="width: 800px">
        <colgroup><col style="width: 25%"><col style="width: 75%"></colgroup>
        <tr><td>A</td><td>
          <table style="margin-left: 10%"><tr><td>B</td></tr></table>
        </td></tr>
      </table>`);
      const nested = toArray(toArray(tbl['w:tr'])[0]['w:tc'])[1]['w:tbl'];

      // 10% of 75% of 800px, which is 12000 twips
      expect(describeIndent(nested)).toBe('900 dxa');
    });
  });

  // Word repeats header rows at the top of every page the table continues on,
  // but only the ones that start the table
  describe('header rows', () => {
    /** Whether each row is marked as a header row (`w:tblHeader`). */
    const describeHeaderRows = (tbl: any): boolean[] =>
      toArray(tbl['w:tr']).map(
        (tr: any) => tr['w:trPr']?.['w:tblHeader'] !== undefined
      );

    it('marks the rows of a <thead> and the rows of only <th> cells that start the table', async () => {
      const tbl = await convertTable(`<table>
        <thead><tr><td>Head</td><td>Head</td></tr></thead>
        <tbody>
          <tr><th>Th</th><th>Th</th></tr>
          <tr><th>Row header</th><td>A</td></tr>
          <tr><th>Th</th><th>Th</th></tr>
        </tbody>
      </table>`);

      expect(describeHeaderRows(tbl)).toEqual([true, true, false, false]);
    });

    it('marks no rows when the first row is not a header row', async () => {
      const tbl = await convertTable(`<table>
        <tr><td>A</td><td>B</td></tr>
        <tr><th>Th</th><th>Th</th></tr>
      </table>`);

      expect(describeHeaderRows(tbl)).toEqual([false, false]);
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

    it('suppresses only the side of the cells along the table border that is hidden', async () => {
      const tbl = await convertTable(`<table style="border-top-style: hidden">
        <tr><td style="${solid}">A</td></tr>
        <tr><td style="${solid}">B</td></tr>
      </table>`);

      expect(describeBorders(tbl).map((cells) => cells[0])).toEqual([
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
