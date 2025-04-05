// import { DocxAdapter } from '../src/DocxAdapter';
import { Packer } from 'docx';
import { DocxAdapter } from '../../../converters';
import { DocumentElement } from '../../../core';

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parses the document.xml from a DOCX buffer and returns a JSON representation.
 * @param docxBuffer The DOCX file as a Buffer.
 */
async function parseDocxDocument(docxBuffer: Buffer): Promise<any> {
  // Load the DOCX file as a ZIP archive
  const zip = await JSZip.loadAsync(docxBuffer);

  // Extract the main document XML (usually at word/document.xml)
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Document.xml not found in DOCX.');
  }
  const documentXml = await documentXmlFile.async('text');

  // Parse the XML string into a JSON object
  const parser = new XMLParser({
    ignoreAttributes: false, // Set this to true if you want to ignore attributes
  });
  const jsonObj = parser.parse(documentXml);
  return jsonObj;
}

describe('Docx.adapter.convert', () => {
  let adapter: DocxAdapter;

  beforeEach(() => {
    adapter = new DocxAdapter();
  });

  describe('general', () => {
    it('should create a DOCX buffer from an empty DocumentElement array', async () => {
      const elements: DocumentElement[] = [];
      const buffer = await adapter.convert(elements);
      expect(buffer).toBeInstanceOf(Buffer);
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
      const runProps = heading['w:pPr']['w:rPr'];

      // Check heading style for Heading1
      expect(heading['w:pPr']['w:pStyle']['@_w:val']).toBe('Heading1');
      // Check that the run text is correct
      expect(heading['w:r']['w:t']['#text']).toBe('Styled Heading');

      // Check for extra bold and italic properties in run formatting
      expect(runProps).toHaveProperty('w:b');
      expect(runProps).toHaveProperty('w:bCs');
      expect(runProps).toHaveProperty('w:i');
      expect(runProps).toHaveProperty('w:iCs');
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
            color: '#00ff00',
          },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const heading = jsonDocument['w:document']['w:body']['w:p'];
      const runProps = heading['w:pPr']['w:rPr'];

      // Check heading style for Heading2
      expect(heading['w:pPr']['w:pStyle']['@_w:val']).toBe('Heading2');
      // Check run text
      expect(heading['w:r']['w:t']['#text']).toBe('Custom Styled Heading');

      // Underline: our mapping should add w:u with a value of "single"

      expect(runProps['w:u']['@_w:val']).toBe('single');
      expect(runProps['w:sz']['@_w:val']).toBe('30');
      expect(runProps['w:color']['@_w:val']).toBe('00ff00');
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
          styles: { color: '#ff0000' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      expect(para['w:r']['w:rPr']['w:color']['@_w:val']).toBe('ff0000');
      expect(para['w:r']['w:t']['#text']).toBe('Colored text');
    });

    it('should render highlighted paragraph (background color)', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Highlighted text',
          styles: { backgroundColor: '#ffff00' },
          attributes: {},
        },
      ];
      const buffer = await adapter.convert(elements);
      const jsonDocument = await parseDocxDocument(buffer);
      const para = jsonDocument['w:document']['w:body']['w:p'];

      // NOTE: depends on how your adapter maps backgroundColor
      // May need to map hex -> "yellow" or similar
      expect(para['w:r']['w:rPr']).toHaveProperty('w:highlight');
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
});
