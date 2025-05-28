import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { IDOMParser } from '../../src';
import { JSDOM } from 'jsdom';

/**
 * Parses the document.xml from a DOCX buffer and returns a JSON representation.
 * @param docxBuffer The DOCX file as a Buffer.
 */
export async function parseDocxDocument(
  docxBuffer: Buffer | Blob
): Promise<any> {
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
    ignoreAttributes: false, // Attributes are not ignored
    parseTagValue: false, // `false` ensures that tag values are captured under '#text'
    textNodeName: '#text', // Standard name for text node content
    attributeNamePrefix: '@_', // Standard prefix for attributes
  });
  const jsonObj = parser.parse(documentXml);
  return jsonObj;
}

export class JSDOMParser implements IDOMParser {
  parse(html: string): Document {
    const dom = new JSDOM(html);
    return dom.window.document;
  }
}
