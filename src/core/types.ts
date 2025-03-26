export type DocumentElementTypes =
  | 'paragraph'
  | 'text'
  | 'heading'
  | 'list'
  | 'list-item'
  | 'table'
  | 'table-cell'
  | 'image'
  | 'link'
  | 'code'
  | 'blockquote'
  | 'custom';

export interface DocumentElement {
  type: DocumentElementTypes;
  content?: DocumentElement[]; // nested elements
  text?: string;
  level?: number; // For headings
  src?: string; // For images
  rows?: TableRowElement[];
  styles?: Record<string, string>;
  attributes?: { [key: string]: any };
}

export interface TableElement extends DocumentElement {
  rows: TableRowElement[];
}

export interface TableRowElement {
  cells: TableCellElement[];
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
}

export interface TableCellElement extends DocumentElement {
  colspan?: number;
  rowspan?: number;
}

export type Middleware = (html: string) => Promise<string>;
export type TagHandler = (
  element: HTMLElement | ChildNode,
  options?: { [key: string]: any }
) => DocumentElement;
