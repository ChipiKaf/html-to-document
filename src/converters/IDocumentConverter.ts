import { DocumentElement } from '../core';

export interface IDocumentConverter {
  convert(elements: DocumentElement[]): Promise<Buffer | Blob>;
}
