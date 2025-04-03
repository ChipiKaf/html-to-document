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
});
