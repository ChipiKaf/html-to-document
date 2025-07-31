import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { IDOMParser } from 'html-to-document';
import { JSDOM } from 'jsdom';

/**
 * Parses the document.xml from a DOCX buffer and returns a JSON representation.
 * @param docxBuffer The DOCX file as a Buffer.
 */
export async function parseDocxXml(
  docxBuffer: Buffer | Blob,
  path = 'word/document.xml'
): Promise<any> {
  // Load the DOCX file as a ZIP archive
  const zip = await JSZip.loadAsync(docxBuffer);

  // Extract the specified XML
  const xmlFile = zip.file(path);
  if (!xmlFile) {
    throw new Error(`${path} not found in DOCX.`);
  }
  const xml = await xmlFile.async('text');

  // Parse the XML string into a JSON object
  const parser = new XMLParser({
    ignoreAttributes: false, // Set this to true if you want to ignore attributes
  });
  return parser.parse(xml);
}

export async function parseDocxDocument(
  docxBuffer: Buffer | Blob
): Promise<any> {
  return parseDocxXml(docxBuffer, 'word/document.xml');
}

export class JSDOMParser implements IDOMParser {
  public parse(html: string): Document {
    const dom = new JSDOM(html);
    return dom.window.document;
  }
}
