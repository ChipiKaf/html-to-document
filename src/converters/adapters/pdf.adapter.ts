import { DocumentElement } from '../../core';
import { IDocumentConverter } from '../IDocumentConverter';

export class PdfAdapter implements IDocumentConverter {
  convert(elements: DocumentElement[]): Promise<Buffer> {
    console.log(elements);
    throw new Error('Method not implemented.');
  }
}
