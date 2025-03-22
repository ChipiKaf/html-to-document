export type DocumentElementTypes =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'table'
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
  rows?: any[]; // For tables
  styles?: Record<string, string>;
  attributes: { [key: string]: any };
  // other fields...
}

export type Middleware = (html: string) => Promise<string>;
export type TagHandler = (element: HTMLElement | ChildNode) => DocumentElement;
