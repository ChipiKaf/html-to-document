import { DocxAdapter } from '../../../src/converters';
import { DocumentElement } from '../../../src/core';
import { minifyMiddleware } from '../../../src/middleware/minify.middleware';
import { Parser } from '../../../src/core/parser';
import { StyleMapper } from '../../../src/core/style.mapper';
import { JSDOMParser, parseDocxDocument } from '../../utils/parser.helper';

// Helper function to recursively find a drawing element in the DOCX JSON structure.
const findDrawingInObject = (obj: any): boolean => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if ('w:drawing' in obj) {
    return true;
  }
  return Object.values(obj).some((value) => findDrawingInObject(value));
};
describe('Docx.adapter.convert', () => {
  let adapter: DocxAdapter;
  let parser: Parser;
  beforeEach(() => {
    adapter = new DocxAdapter({ styleMapper: new StyleMapper() });
    parser = new Parser([], new JSDOMParser());
  });

  describe('general', () => {
    it('should create a DOCX buffer from an empty DocumentElement array', async () => {
      const elements: DocumentElement[] = [];
      const buffer = await adapter.convert(elements);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
  describe('DocxAdapter image conversion', () => {
    let adapter: DocxAdapter;
    let parser: Parser;

    beforeEach(() => {
      adapter = new DocxAdapter({ styleMapper: new StyleMapper() });
      parser = new Parser([], new JSDOMParser());
    });

    describe('Base64 data URI image', () => {
      const base64Png =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9w8rKQAAAABJRU5ErkJggg==';
      const dataUri = `data:image/png;base64,${base64Png}`;

      it('should correctly embed a base64 data URI image', async () => {
        const elements: DocumentElement[] = [
          {
            type: 'image',
            src: dataUri,
          },
        ];

        const buffer = await adapter.convert(elements);
        expect(buffer).toBeInstanceOf(Buffer);

        // Parse the DOCX document into JSON.
        const jsonDocument = await parseDocxDocument(buffer);
        const body = jsonDocument['w:document']['w:body'];
        // Look for the drawing element that indicates an image.
        const hasDrawing = findDrawingInObject(body);
        expect(hasDrawing).toBe(true);
      });
    });

    describe('Remote image (with mocked fetch)', () => {
      const remoteUrl = 'https://example.com/image.png';
      const fakeArrayBuffer = Uint8Array.from([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]).buffer; // This represents a PNG header.

      beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => fakeArrayBuffer,
          headers: { get: () => 'image/png' },
        });
      });

      it('should correctly fetch and embed a remote image', async () => {
        const elements: DocumentElement[] = [
          {
            type: 'image',
            src: remoteUrl,
          },
        ];

        const buffer = await adapter.convert(elements);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(global.fetch).toHaveBeenCalledWith(remoteUrl);

        const jsonDocument = await parseDocxDocument(buffer);
        const body = jsonDocument['w:document']['w:body'];
        // Verify the DOCX document contains a drawing element for the remote image.
        const hasDrawing = findDrawingInObject(body);
        expect(hasDrawing).toBe(true);
      });
    });

    describe('Invalid image source', () => {
      it('should throw an error for an invalid image src', async () => {
        const elements: DocumentElement[] = [
          {
            type: 'image',
            src: '',
          },
        ];
        await expect(adapter.convert(elements)).rejects.toThrow(
          'No src defined for image.'
        );
      });
    });
  });

  describe('heading', () => {
    it('should create a DOCX buffer with different headings and their heading levels', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Heading 1',
          level: 1,
          styles: {},
          attributes: {},
        },
        {
          type: 'heading',
          text: 'Heading 2',
          level: 2,
          styles: {},
          attributes: {},
        },
        {
          type: 'heading',
          text: 'Heading 3',
          level: 3,
          styles: {},
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      expect(buffer).toBeInstanceOf(Buffer);

      const headingParagraphs = jsonDocument['w:document']['w:body']['w:p'];

      expect(headingParagraphs[0]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'Heading1'
      );
      expect(headingParagraphs[0]['w:r']['w:t']['#text']).toBe('Heading 1');

      expect(headingParagraphs[1]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'Heading2'
      );
      expect(headingParagraphs[1]['w:r']['w:t']['#text']).toBe('Heading 2');

      expect(headingParagraphs[2]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'Heading3'
      );
      expect(headingParagraphs[2]['w:r']['w:t']['#text']).toBe('Heading 3');
    });
    it('should render a heading with extra bold and italic styling', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Styled Heading',
          level: 1,
          styles: { fontWeight: 'bold', fontStyle: 'italic' },
          attributes: {},
        },
      ];

      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const heading = jsonDocument['w:document']['w:body']['w:p'];

      // Paragraph-level properties
      const paraProps = heading['w:pPr'];
      expect(paraProps['w:pStyle']['@_w:val']).toBe('Heading1');

      // Run-level properties (inside w:r)
      const run = heading['w:r'];
      expect(run['w:t']['#text']).toBe('Styled Heading');

      const runProps = run['w:rPr'];
      expect(runProps).toHaveProperty('w:b'); // bold
      expect(runProps).toHaveProperty('w:bCs'); // bold complex script
      expect(runProps).toHaveProperty('w:i'); // italic
      expect(runProps).toHaveProperty('w:iCs'); // italic complex script
    });

    it('should render a heading with underline, custom font size, and text color', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Custom Styled Heading',
          level: 2,
          styles: {
            textDecoration: 'underline',
            fontSize: '20px',
            color: '#00FF00',
          },
          attributes: {},
        },
      ];

      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const heading = jsonDocument['w:document']['w:body']['w:p'];

      // Paragraph-level check
      expect(heading['w:pPr']['w:pStyle']['@_w:val']).toBe('Heading2');

      // Run-level check
      const run = heading['w:r'];
      const runProps = run['w:rPr'];

      expect(run['w:t']['#text']).toBe('Custom Styled Heading');
      expect(runProps['w:u']['@_w:val']).toBe('single'); // Underline
      expect(runProps['w:sz']['@_w:val']).toBe('30'); // Font size (20px → 30 half-points)
      expect(runProps['w:color']['@_w:val']).toBe('00FF00'); // Text color
    });
  });

  describe('Paragraph styles', () => {
    it("should return 2 adjacent paragraphs with the parent's styles passed down when you have nested paragraphs", async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Text only',
            },
            {
              type: 'paragraph',
              text: 'Hello here',
              styles: { fontStyle: 'italic' },
            },
          ],
          styles: { fontWeight: 'bold' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const paragraphs = jsonDocument['w:document']['w:body']['w:p'];

      expect(paragraphs[0]['w:r']['w:rPr']).toHaveProperty('w:b');
      expect(paragraphs[0]['w:r']['w:t']['#text']).toBe('Text only');

      expect(paragraphs[1]['w:r']['w:rPr']).toHaveProperty('w:b');
      expect(paragraphs[1]['w:r']['w:rPr']).toHaveProperty('w:i');
      expect(paragraphs[1]['w:r']['w:t']['#text']).toBe('Hello here');
    });
    it('should render italic paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Italic text',
          styles: { fontStyle: 'italic' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      expect(para['w:r']['w:rPr']).toHaveProperty('w:i');
      expect(para['w:r']['w:rPr']).toHaveProperty('w:iCs');
      expect(para['w:r']['w:t']['#text']).toBe('Italic text');
    });
    it('should render centered text in the paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Center text',
          styles: { textAlign: 'center' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];
      expect(para['w:pPr']['w:jc']['@_w:val']).toEqual('center');
      expect(para['w:r']['w:t']['#text']).toBe('Center text');
    });
    it('should create a DOCX buffer with a bold paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: { fontWeight: 'bold' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      expect(buffer).toBeInstanceOf(Buffer);

      const boldParagraph = jsonDocument['w:document']['w:body']['w:p'];

      expect(boldParagraph['w:r']['w:t']['#text']).toBe('Test paragraph');

      const runProps = boldParagraph['w:r']['w:rPr'];
      expect(runProps).toHaveProperty('w:b');
      expect(runProps).toHaveProperty('w:bCs');
    });

    it('should render underlined paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Underlined text',
          styles: { textDecoration: 'underline' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      expect(para['w:r']['w:rPr']['w:u']['@_w:val']).toBe('single');
      expect(para['w:r']['w:t']['#text']).toBe('Underlined text');
    });

    it('should render colored paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Colored text',
          styles: { color: '#FF0000' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      expect(para['w:r']['w:rPr']['w:color']['@_w:val']).toBe('FF0000');
      expect(para['w:r']['w:t']['#text']).toBe('Colored text');
    });

    it('should render highlighted paragraph (background color)', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Highlighted text',
          styles: { backgroundColor: '#FFFF00' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      // NOTE: depends on how your adapter maps backgroundColor
      // May need to map hex -> "yellow" or similar
      // expect(para['w:r']['w:rPr']['w:shd']).toHaveProperty('w:color');
      expect(para['w:r']['w:rPr']['w:shd']).toHaveProperty('@_w:fill');
      expect(para['w:r']['w:rPr']['w:shd']).toHaveProperty('@_w:val');
      expect(para['w:r']['w:t']['#text']).toBe('Highlighted text');
    });

    it('should render custom font size', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Sized text',
          styles: { fontSize: '16px' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      // 16px -> 12pt -> 24 half-points
      expect(para['w:r']['w:rPr']['w:sz']['@_w:val']).toBe('24');
      expect(para['w:r']['w:t']['#text']).toBe('Sized text');
    });
    it('should flatten nested inline spans into separate text runs with correct styles', async () => {
      let html = `<p style="font-weight:bold" data-custom="x">
      <span style="color: red;">Hello
        <span style="color: green;">Green World</span>
      </span>World</p>`;

      html = await minifyMiddleware(html);
      const elements = parser.parse(html);
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);

      const runs = jsonDocument['w:document']['w:body']['w:p']['w:r'];

      // Ensure we have 3 runs: "Hello", "Green World", "World"
      expect(runs).toHaveLength(3);

      // Run 1: "Hello" with red
      expect(runs[0]['w:t']['#text']).toBe('Hello');
      expect(runs[0]['w:rPr']['w:color']['@_w:val']).toBe('FF0000');

      // Run 2: "Green World" with green
      expect(runs[1]['w:t']['#text']).toBe('Green World');
      expect(runs[1]['w:rPr']['w:color']['@_w:val']).toBe('008000');

      // Run 3: "World" with no color
      expect(runs[2]['w:t']['#text']).toBe('World');
      expect(runs[2]['w:rPr']['w:color']).toBeUndefined();

      // All runs should preserve bold styling from paragraph
      runs.forEach((run: any) => {
        expect(run['w:rPr']['w:b']).toBe('');
        expect(run['w:rPr']['w:bCs']).toBe('');
      });
    });
    it('should render subscript and superscript text correctly', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'H' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'sub' },
            },
            { type: 'text', text: 'O and x' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'super' },
            },
          ],
          styles: {},
          attributes: {},
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const runs = json['w:document']['w:body']['w:p']['w:r'];

      expect(runs).toHaveLength(4);

      // Check text content
      expect(runs[0]['w:t']['#text']).toBe('H');
      expect(runs[1]['w:t']['#text']).toBe(2);
      expect(runs[2]['w:t']['#text']).toBe('O and x');
      expect(runs[3]['w:t']['#text']).toBe(2);

      // Check subscript run
      expect(runs[1]['w:rPr']['w:vertAlign']['@_w:val']).toBe('subscript');

      // Check superscript run
      expect(runs[3]['w:rPr']['w:vertAlign']['@_w:val']).toBe('superscript');
    });
  });
  describe('Complex styled paragraph', () => {
    it('should apply paragraph-level styles (justify, shading, spacing, indent)', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Here is a ' },
            {
              type: 'text',
              text: ' combined decoration ',
              styles: { textDecoration: 'line-through underline' },
              attributes: {},
            },
            {
              type: 'text',
              text: ' example with both strike‑through and underline.',
            },
          ],
          styles: {
            margin: '20px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            marginBottom: '5px',
            marginTop: '5px',
            textAlign: 'justify',
          },
          attributes: {},
          metadata: {},
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const para = json['w:document']['w:body']['w:p'];

      // 1A) Justification
      expect(para['w:pPr']['w:jc']['@_w:val']).toBe('both');

      // 1B) Shading (backgroundColor)
      const shd = para['w:pPr']['w:shd'];
      expect(shd['@_w:fill']).toBe('F9F9F9');
      expect(shd['@_w:val']).toBe('clear');

      // 1C) Spacing: marginTop=5px→5*20=100, marginBottom=5px→100
      const spacing = para['w:pPr']['w:spacing'];
      expect(Number(spacing['@_w:before'])).toBe(100);
      expect(Number(spacing['@_w:after'])).toBe(100);

      // 1D) Indent: padding 15px→15*15=225 twips on left/right
      const ind = para['w:pPr']['w:ind'];
      expect(Number(ind['@_w:left'])).toBe(225);
      expect(Number(ind['@_w:right'])).toBe(225);
    });

    it('should render three runs and combine line‑through + underline on the second run', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Here is a ' },
            {
              type: 'text',
              text: ' combined decoration ',
              styles: { textDecoration: 'line-through underline' },
              attributes: {},
            },
            {
              type: 'text',
              text: ' example with both strike‑through and underline.',
            },
          ],
          styles: {},
          attributes: {},
          metadata: {},
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const p = json['w:document']['w:body']['w:p'];
      const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];

      // Expect exactly three runs
      expect(runs).toHaveLength(3);

      // Run 1: plain
      expect(runs[0]['w:t']['#text']).toBe('Here is a');
      expect(runs[0]['w:rPr']).toBeUndefined(); // no decoration

      // Run 2: combined decoration
      expect(runs[1]['w:t']['#text']).toBe('combined decoration');
      const decoProps = runs[1]['w:rPr'];
      // strike-through
      expect(decoProps).toHaveProperty('w:strike');
      // underline (single)
      expect(decoProps['w:u']['@_w:val']).toBe('single');

      // Run 3: plain tail
      expect(runs[2]['w:t']['#text']).toBe(
        'example with both strike‑through and underline.'
      );
      expect(runs[2]['w:rPr']).toBeUndefined();
    });
  });
  describe('Links', () => {
    it('should correctly render a hyperlink within a paragraph', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is a' },
            {
              type: 'text',
              text: 'link',
              styles: { color: 'blue' },
              attributes: { href: 'https://example.com' },
            },
            { type: 'text', text: 'inside a paragraph.' },
          ],
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraph = json['w:document']['w:body']['w:p'];

      // Validate the normal text runs
      const runs = paragraph['w:r'];
      expect(Array.isArray(runs)).toBe(true);
      expect(runs[0]['w:t']['#text']).toBe('This is a');
      expect(runs[1]['w:t']['#text']).toBe('inside a paragraph.');

      // Validate the hyperlink
      const hyperlink = paragraph['w:hyperlink'];
      expect(hyperlink).toBeDefined();
      expect(hyperlink['@_r:id']).toMatch(/^rId/);
      expect(hyperlink['w:r']['w:t']['#text']).toBe('link');

      // Validate styling
      expect(
        hyperlink['w:r']['w:rPr']['w:color']['@_w:val'].toUpperCase()
      ).toBe('0000FF');
    });
  });
  describe('Lists', () => {
    it('should render a flat unordered list with correct bullet symbols at level 0', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'list',
          listType: 'unordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Item 1' }],
              level: 0,
              metadata: { reference: 'unordered', level: '0' },
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Item 2' }],
              level: 0,
              metadata: { reference: 'unordered', level: '0' },
            },
          ],
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraphs = json['w:document']['w:body']['w:p'];

      // Validate text content
      expect(paragraphs[0]['w:r']['w:t']['#text']).toBe('Item 1');
      expect(paragraphs[1]['w:r']['w:t']['#text']).toBe('Item 2');

      // Validate both are level 0
      for (let i = 0; i < 2; i++) {
        expect(paragraphs[i]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe(
          '0'
        );
        expect(
          paragraphs[i]['w:pPr']['w:numPr']['w:numId']['@_w:val']
        ).toBeDefined();
      }
    });
    it('should render a flat ordered list with decimal numbering at level 0', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'list',
          listType: 'ordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Step 1' }],
              level: 0,
              metadata: { reference: 'ordered', level: '0' },
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Step 2' }],
              level: 0,
              metadata: { reference: 'ordered', level: '0' },
            },
          ],
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraphs = json['w:document']['w:body']['w:p'];

      expect(paragraphs[0]['w:r']['w:t']['#text']).toBe('Step 1');
      expect(paragraphs[1]['w:r']['w:t']['#text']).toBe('Step 2');

      // Validate both are at level 0
      for (let i = 0; i < 2; i++) {
        expect(paragraphs[i]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe(
          '0'
        );
        expect(
          paragraphs[i]['w:pPr']['w:numPr']['w:numId']['@_w:val']
        ).toBeDefined();
      }
    });
    it('should render 2 separate lists', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'list',
          listType: 'ordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'text',
                  text: 'Ordered Item 1',
                },
              ],
            },
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'text',
                  text: 'Ordered Item 2',
                },
              ],
            },
          ],
        },
        {
          type: 'list',
          listType: 'unordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'text',
                  text: 'Unordered Item 1',
                },
              ],
            },
            {
              type: 'list-item',
              level: 0,
              content: [
                {
                  type: 'text',
                  text: 'Unordered Item 2',
                },
              ],
            },
          ],
        },
      ];
      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraphs = json['w:document']['w:body']['w:p'];
      // Expect list paragraph styling
      expect(paragraphs[0]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'ListParagraph'
      );
      expect(paragraphs[1]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'ListParagraph'
      );
      expect(paragraphs[2]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'ListParagraph'
      );
      expect(paragraphs[3]['w:pPr']['w:pStyle']['@_w:val']).toBe(
        'ListParagraph'
      );
      // Expect level
      expect(paragraphs[0]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(paragraphs[1]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(paragraphs[2]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(paragraphs[3]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');

      // Expect Number Id
      expect(
        paragraphs[0]['w:pPr']['w:numPr']['w:numId']['@_w:val']
      ).toBeTruthy();
      expect(
        paragraphs[1]['w:pPr']['w:numPr']['w:numId']['@_w:val']
      ).toBeTruthy();
      expect(
        paragraphs[2]['w:pPr']['w:numPr']['w:numId']['@_w:val']
      ).toBeTruthy();
      expect(
        paragraphs[3]['w:pPr']['w:numPr']['w:numId']['@_w:val']
      ).toBeTruthy();
    });
    it('should render a complex list with nested lists and styling', async () => {
      const elements: DocumentElement[] = [
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
                  text: 'Indent level 0 a',
                },
                {
                  type: 'text',
                  text: 'Indent level 0 a [Just bold]',
                  styles: { fontWeight: 'bold' },
                },
                {
                  type: 'list',
                  listType: 'unordered',
                  content: [
                    {
                      type: 'list-item',
                      text: 'Indent level 1',
                      level: 1,
                      metadata: { level: '1' },
                    },
                  ],
                  level: 1,
                  metadata: { level: '1' },
                },
                {
                  type: 'text',
                  text: 'Indent level 0 b',
                },
              ],
              metadata: { level: '0' },
              styles: { color: 'red' },
            },
            {
              type: 'list-item',
              text: 'Indent level 0 c',
              level: 0,
              metadata: { level: '0' },
            },
          ],
          level: 0,
          styles: { fontWeight: 'bold' },
          attributes: { 'data-custom': 'x' },
          metadata: { level: '0' },
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraphs = json['w:document']['w:body']['w:p'];

      expect(paragraphs.length).toBe(4); // 2 from first item, 1 nested, 1 for second item

      // Paragraph 0 – first item (two inline text runs)
      const p0 = paragraphs[0];
      expect(p0['w:pPr']['w:pStyle']['@_w:val']).toBe('ListParagraph');
      expect(p0['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(p0['w:r'].length).toBe(2); // two text runs
      expect(p0['w:r'][0]['w:t']['#text']).toBe('Indent level 0 a');
      expect(p0['w:r'][1]['w:t']['#text']).toBe('Indent level 0 a [Just bold]');
      expect(p0['w:r'][0]['w:rPr']['w:color']['@_w:val']).toBe('FF0000');

      // Paragraph 1 – nested list (level 1)
      const p1 = paragraphs[1];
      expect(p1['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('1');
      expect(p1['w:r']['w:t']['#text']).toBe('Indent level 1');

      // Paragraph 2 – back to level 0 ("Indent level 0 b")
      const p2 = paragraphs[2];
      expect(p2['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(p2['w:r']['w:t']['#text']).toBe('Indent level 0 b');

      // Paragraph 3 – next list item ("Indent level 0 c")
      const p3 = paragraphs[3];
      expect(p3['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(p3['w:r']['w:t']['#text']).toBe('Indent level 0 c');
    });
    it('should correctly render deeply nested mixed list levels with preserved styling and hierarchy', async () => {
      const elements: DocumentElement[] = [
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
                  text: 'Indent level 0 a',
                },
                {
                  type: 'list',
                  listType: 'unordered',
                  content: [
                    {
                      type: 'list-item',
                      text: 'Indent level 1',
                      level: 1,
                      metadata: { level: '1' },
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
                              metadata: { level: '2' },
                            },
                            {
                              type: 'list-item',
                              text: 'Indent level 2 b',
                              level: 2,
                              metadata: { level: '2' },
                            },
                          ],
                          level: 2,
                          metadata: { level: '2' },
                        },
                      ],
                      metadata: { level: '1' },
                    },
                  ],
                  level: 1,
                  metadata: { level: '1' },
                },
              ],
              metadata: { level: '0' },
              styles: { color: 'red' },
            },
            {
              type: 'list-item',
              text: 'Indent level 0 b',
              level: 0,
              metadata: { level: '0' },
            },
          ],
          level: 0,
          styles: { fontWeight: 'bold' },
          attributes: { 'data-custom': 'x' },
          metadata: { level: '0' },
        },
      ];

      const buffer = await adapter.convert(elements);
      const json = await parseDocxDocument(buffer);
      const paragraphs = json['w:document']['w:body']['w:p'];

      expect(paragraphs.length).toBe(5);

      // Paragraph 0 – "Indent level 0 a"
      expect(paragraphs[0]['w:r']['w:t']['#text']).toBe('Indent level 0 a');
      expect(paragraphs[0]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(paragraphs[0]['w:pPr']['w:numPr']['w:numId']['@_w:val']).toBe('2');

      // Paragraph 1 – "Indent level 1"
      expect(paragraphs[1]['w:r']['w:t']['#text']).toBe('Indent level 1');
      expect(paragraphs[1]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('1');
      expect(paragraphs[1]['w:pPr']['w:numPr']['w:numId']['@_w:val']).toBe('2');

      // Paragraph 2 – "Indent level 2 a"
      expect(paragraphs[2]['w:r']['w:t']['#text']).toBe('Indent level 2 a');
      expect(paragraphs[2]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('2');
      expect(paragraphs[2]['w:pPr']['w:numPr']['w:numId']['@_w:val']).toBe('3');

      // Paragraph 3 – "Indent level 2 b"
      expect(paragraphs[3]['w:r']['w:t']['#text']).toBe('Indent level 2 b');
      expect(paragraphs[3]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('2');
      expect(paragraphs[3]['w:pPr']['w:numPr']['w:numId']['@_w:val']).toBe('3');

      // Paragraph 4 – "Indent level 0 b"
      expect(paragraphs[4]['w:r']['w:t']['#text']).toBe('Indent level 0 b');
      expect(paragraphs[4]['w:pPr']['w:numPr']['w:ilvl']['@_w:val']).toBe('0');
      expect(paragraphs[4]['w:pPr']['w:numPr']['w:numId']['@_w:val']).toBe('2');
    });
  });
  describe('Line', () => {
    it('should convert a horizontal line (type "line") to a DOCX paragraph with a bottom border', async () => {
      // Create a DocumentElement with type 'line'
      const element: DocumentElement = {
        type: 'line',
        styles: {},
        attributes: {},
      };

      // Convert the element using the adapter
      const buffer = await adapter.convert([element]);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse the resulting DOCX document into JSON for assertions
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      // Check that the paragraph has paragraph properties.
      expect(para['w:pPr']).toBeDefined();

      // Check that a paragraph border property (w:pBdr) exists.
      expect(para['w:pPr']['w:pBdr']).toBeDefined();

      // The bottom border should be set to simulate the horizontal line.
      expect(para['w:pPr']['w:pBdr']['w:bottom']).toBeDefined();
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:val']).toBe('single');
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:sz']).toBe('6');

      // Optionally, you might also check the border's color and spacing if that is important:
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:color']).toBe('808080');
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:space']).toBe('1');
    });
    it('should render a horizontal line with added margins and center alignment', async () => {
      // Create a DocumentElement representing a horizontal line with extra styles.
      const element: DocumentElement = {
        type: 'line',
        styles: {
          marginTop: '10px', // should map to spacing.before (10 * 20 = 200)
          marginBottom: '5px', // should map to spacing.after (5 * 20 = 100)
          textAlign: 'center', // should map to w:jc with value "center"
        },
        attributes: {},
      };

      const buffer = await adapter.convert([element]);
      expect(buffer).toBeInstanceOf(Buffer);

      // Parse the DOCX buffer into a JSON object for assertions.
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      // Verify that the default border settings for the line are present.
      expect(para['w:pPr']['w:pBdr']).toBeDefined();
      expect(para['w:pPr']['w:pBdr']['w:bottom']).toBeDefined();
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:val']).toBe('single');
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:sz']).toBe('6');
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:color']).toBe('808080');
      expect(para['w:pPr']['w:pBdr']['w:bottom']['@_w:space']).toBe('1');

      // Verify that additional spacing styles are merged properly.
      // marginTop "10px" maps to 10 * 20 = 200
      // marginBottom "5px" maps to 5 * 20 = 100
      expect(para['w:pPr']['w:spacing']['@_w:before']).toBe('200');
      expect(para['w:pPr']['w:spacing']['@_w:after']).toBe('100');

      // Verify that text alignment is mapped. For center alignment, DOCX uses w:jc.
      expect(para['w:pPr']['w:jc']['@_w:val']).toBe('center');
    });
  });
  describe('Table', () => {
    let adapter: DocxAdapter;
    let parser: Parser;

    beforeEach(() => {
      adapter = new DocxAdapter({ styleMapper: new StyleMapper() });
      parser = new Parser();
    });

    // Helper to extract the table from the parsed DOCX document.
    const getTableFromDocx = (jsonDocument: any): any => {
      const body = jsonDocument['w:document']['w:body'];
      // If multiple elements are present, tables are under the 'w:tbl' key.
      if (Array.isArray(body['w:tbl'])) {
        return body['w:tbl'][0];
      }
      return body['w:tbl'];
    };

    it('should convert a simple table with one row and one cell', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            type: 'table-row',
            attributes: {},
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell A' }],
                styles: {},
              },
            ],
            styles: {},
          },
        ],
        styles: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);

      // Check that a table exists and has one row.
      expect(tbl).toBeDefined();
      const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']];
      expect(rows.length).toBe(1);

      // Check that the row contains one cell with the expected text.
      const row = rows[0];
      const cells = Array.isArray(row['w:tc']) ? row['w:tc'] : [row['w:tc']];
      expect(cells.length).toBe(1);
      const cell = cells[0];
      const para = Array.isArray(cell['w:p']) ? cell['w:p'][0] : cell['w:p'];
      const cellText = Array.isArray(para['w:r'])
        ? para['w:r'][0]['w:t']['#text']
        : para['w:r']['w:t']['#text'];
      expect(cellText).toBe('Cell A');
    });

    it('should render a table with 50% width', async () => {
      const table: DocumentElement = {
        type: 'table',
        styles: { width: '50%' },
        attributes: {},
        rows: [
          {
            type: 'table-row',
            attributes: {},
            styles: {},
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Foo' }],
                styles: {},
                attributes: {},
              },
            ],
          },
        ],
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);

      // Extract the <w:tblPr> properties
      const tblPr = tbl['w:tblPr'];
      expect(tblPr).toBeDefined();
      expect(tblPr).toHaveProperty('w:tblW');

      const tblW = tblPr['w:tblW'];
      // 50% should be serialized as 2500 (i.e. 50% × 50 = 2500 fiftieths of a percent)
      expect(tblW['@_w:w']).toBe('50%');
      expect(tblW['@_w:type']).toBe('pct');
    });

    it('should convert a table with multiple rows and columns', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            attributes: {},
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell 1' }],
                styles: {},
              },
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell 2' }],
                styles: {},
              },
            ],
            styles: {},
          },
          {
            attributes: {},
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell 3' }],
                styles: {},
              },
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell 4' }],
                styles: {},
              },
            ],
            styles: {},
          },
        ],
        styles: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);

      const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']];
      expect(rows.length).toBe(2);

      // Verify first row cell texts.
      const row1 = Array.isArray(rows[0]['w:tc'])
        ? rows[0]['w:tc']
        : [rows[0]['w:tc']];
      const cell1Text = Array.isArray(row1[0]['w:p'])
        ? row1[0]['w:p'][0]['w:r']['w:t']['#text']
        : row1[0]['w:p']['w:r']['w:t']['#text'];
      const cell2Text = Array.isArray(row1[1]['w:p'])
        ? row1[1]['w:p'][0]['w:r']['w:t']['#text']
        : row1[1]['w:p']['w:r']['w:t']['#text'];
      expect(cell1Text).toBe('Cell 1');
      expect(cell2Text).toBe('Cell 2');

      // Verify second row cell texts.
      const row2 = Array.isArray(rows[1]['w:tc'])
        ? rows[1]['w:tc']
        : [rows[1]['w:tc']];
      const cell3Text = Array.isArray(row2[0]['w:p'])
        ? row2[0]['w:p'][0]['w:r']['w:t']['#text']
        : row2[0]['w:p']['w:r']['w:t']['#text'];
      const cell4Text = Array.isArray(row2[1]['w:p'])
        ? row2[1]['w:p'][0]['w:r']['w:t']['#text']
        : row2[1]['w:p']['w:r']['w:t']['#text'];
      expect(cell3Text).toBe('Cell 3');
      expect(cell4Text).toBe('Cell 4');
    });

    it('should convert a table with a cell having colspan', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Spanned Cell' }],
                colspan: 2,
                styles: {},
              },
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Normal Cell' }],
                styles: {},
              },
            ],
            styles: {},
            attributes: {},
          },
        ],
        styles: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);
      const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']];

      // In our adapter the horizontal placeholder isn’t added as a separate cell,
      // so we expect 2 cells: one with a grid span and one normal.
      const row = Array.isArray(rows[0]['w:tc'])
        ? rows[0]['w:tc']
        : [rows[0]['w:tc']];
      expect(row.length).toBe(2);

      // Verify the first cell has a gridSpan attribute equal to "2".
      const firstCell = row[0];
      expect(firstCell['w:tcPr']['w:gridSpan']['@_w:val']).toBe('2');

      // Verify the text content.
      const firstCellText = Array.isArray(firstCell['w:p'])
        ? firstCell['w:p'][0]['w:r']['w:t']['#text']
        : firstCell['w:p']['w:r']['w:t']['#text'];
      expect(firstCellText).toBe('Spanned Cell');

      const secondCell = row[1];
      const secondCellText = Array.isArray(secondCell['w:p'])
        ? secondCell['w:p'][0]['w:r']['w:t']['#text']
        : secondCell['w:p']['w:r']['w:t']['#text'];
      expect(secondCellText).toBe('Normal Cell');
    });

    it('should convert a table with one cell spanning two rows in the first column and separate cells in the second column', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            attributes: {},
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell A' }],
                rowspan: 2,
                styles: {},
              },
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell B' }],
                styles: {},
              },
            ],
            styles: {},
          },
          {
            attributes: {},
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Cell C' }],
                styles: {},
              },
            ],
            styles: {},
          },
        ],
        styles: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);
      const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']];

      // There should be 2 rows
      expect(rows.length).toBe(2);

      const row1 = Array.isArray(rows[0]['w:tc'])
        ? rows[0]['w:tc']
        : [rows[0]['w:tc']];
      expect(row1.length).toBe(2);

      const firstCell = row1[0];
      expect(firstCell['w:tcPr']['w:vMerge']['@_w:val']).toBe('restart');
      const firstCellText = Array.isArray(firstCell['w:p'])
        ? firstCell['w:p'][0]['w:r']['w:t']['#text']
        : firstCell['w:p']['w:r']['w:t']['#text'];
      expect(firstCellText).toBe('Cell A');

      const secondCellRow1 = row1[1];
      const secondCellRow1Text = Array.isArray(secondCellRow1['w:p'])
        ? secondCellRow1['w:p'][0]['w:r']['w:t']['#text']
        : secondCellRow1['w:p']['w:r']['w:t']['#text'];
      expect(secondCellRow1Text).toBe('Cell B');

      const row2 = Array.isArray(rows[1]['w:tc'])
        ? rows[1]['w:tc']
        : [rows[1]['w:tc']];
      expect(row2.length).toBe(2);

      const vmCell = row2[0];
      expect(vmCell['w:tcPr']['w:vMerge']['@_w:val']).toBe('continue');
      const vmCellText =
        (vmCell['w:p'] &&
          (Array.isArray(vmCell['w:p'])
            ? vmCell['w:p'][0]['w:r']['w:t']['#text']
            : vmCell['w:p']['w:r']['w:t']['#text'])) ||
        '';
      expect(vmCellText).toBe('');

      const secondCellRow2 = row2[1];
      const secondCellRow2Text = Array.isArray(secondCellRow2['w:p'])
        ? secondCellRow2['w:p'][0]['w:r']['w:t']['#text']
        : secondCellRow2['w:p']['w:r']['w:t']['#text'];
      expect(secondCellRow2Text).toBe('Cell C');
    });

    it('should convert a table with combined colspan and rowspan', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Combined Cell' }],
                colspan: 2,
                rowspan: 2,
                styles: {},
              },
            ],
            styles: {},
          },
          {
            type: 'table-row',
            cells: [],
            styles: {},
            attributes: {},
          },
        ],
        styles: {},
        attributes: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);
      const rows = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']];
      expect(rows.length).toBe(2);

      // First row: verify the master cell has gridSpan of "2" and vertical merge "restart".
      const row1 = Array.isArray(rows[0]['w:tc'])
        ? rows[0]['w:tc']
        : [rows[0]['w:tc']];
      expect(row1.length).toBe(1);
      const combinedCell = row1[0];
      expect(combinedCell['w:tcPr']['w:gridSpan']['@_w:val']).toBe('2');
      expect(combinedCell['w:tcPr']['w:vMerge']['@_w:val']).toBe('restart');
      const combinedCellText = Array.isArray(combinedCell['w:p'])
        ? combinedCell['w:p'][0]['w:r']['w:t']['#text']
        : combinedCell['w:p']['w:r']['w:t']['#text'];
      expect(combinedCellText).toBe('Combined Cell');

      // Second row: expect a vertical merge placeholder and an automatically added empty cell.
      const row2 = Array.isArray(rows[1]['w:tc'])
        ? rows[1]['w:tc']
        : [rows[1]['w:tc']];
      expect(row2.length).toBe(2);
      const vmCell = row2[0];
      expect(vmCell['w:tcPr']['w:vMerge']['@_w:val']).toBe('continue');

      const gapCell = row2[1];
      const gapCellText =
        gapCell?.['w:p']?.[0]?.['w:r']?.['w:t']?.['#text'] || '';
      expect(gapCellText).toBe('');
    });
    it('should render a table cell with centered text alignment', async () => {
      const table: DocumentElement = {
        type: 'table',
        rows: [
          {
            type: 'table-row',
            cells: [
              {
                type: 'table-cell',
                content: [{ type: 'text', text: 'Centered Cell' }],
                styles: { textAlign: 'center' },
              },
            ],
            styles: {},
            attributes: {},
          },
        ],
        styles: {},
        attributes: {},
      };

      const buffer = await adapter.convert([table]);
      const jsonDocument = await parseDocxDocument(buffer);
      const tbl = getTableFromDocx(jsonDocument);

      // Get the first row and the first cell
      const row = Array.isArray(tbl['w:tr']) ? tbl['w:tr'][0] : tbl['w:tr'];
      const cell = Array.isArray(row['w:tc']) ? row['w:tc'][0] : row['w:tc'];
      const para = Array.isArray(cell['w:p']) ? cell['w:p'][0] : cell['w:p'];

      // Check that the paragraph in the table cell has centered alignment.
      // In DOCX, centered text is represented with a <w:jc> element with its attribute value set to "center".
      expect(para['w:pPr']['w:jc']['@_w:val']).toBe('center');

      // Check that the text in the cell is correct.
      const cellText = Array.isArray(para['w:r'])
        ? para['w:r'][0]['w:t']['#text']
        : para['w:r']['w:t']['#text'];
      expect(cellText).toBe('Centered Cell');
    });
  });
});
