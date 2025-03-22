import { DocumentElement } from '../../core';
import { IDocumentConverter } from '../IDocumentConverter';

export class DocxAdapter implements IDocumentConverter {
  convert(elements: DocumentElement[]): Promise<Buffer> {
    throw new Error('Method not implemented.');
  }
}
