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

// Example usage:
// (async () => {
//   // Let's assume you have a DOCX file buffer (docxBuffer)
//   // For example, read from disk:
//   // const docxBuffer = await fs.promises.readFile("path/to/document.docx");
//   // Then call:
//   try {
//     const jsonDocument = await parseDocxDocument(docxBuffer);
//     console.log(JSON.stringify(jsonDocument, null, 2));
//   } catch (error) {
//     console.error('Error parsing DOCX:', error);
//   }
// })();

describe('Docx.adapter.convert', () => {
  let adapter: DocxAdapter;

  beforeEach(() => {
    adapter = new DocxAdapter();
  });

  it('should create a DOCX buffer from a simple DocumentElement array', async () => {
    const elements: DocumentElement[] = [
      {
        type: 'heading',
        text: 'Heading 1',
        level: 1,
        styles: {},
        attributes: {},
      },
      {
        type: 'paragraph',
        text: 'Test paragraph',
        styles: { 'font-weight': 'bold' },
        attributes: {},
      },
    ];
    const buffer = await adapter.convert(elements);
    const jsonDocument = await parseDocxDocument(buffer);
    console.log(JSON.stringify(jsonDocument));
    expect(buffer).toBeInstanceOf(Buffer);

    // Optionally, you could use an XML parser to inspect parts of the generated document.
  });
});
