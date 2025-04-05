export interface BaseElement {
  type: string; // not strictly limited to a union
  styles?: Record<string, string>;
  attributes?: { [key: string]: any };
  metadata?: { [key: string]: any };
  content?: DocumentElement[];
}

export interface ParagraphElement extends BaseElement {
  type: 'paragraph';
  text?: string;
  content?: DocumentElement[];
}

export interface HeadingElement extends BaseElement {
  type: 'heading';
  text: string;
  level: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
}

export interface ListElement extends BaseElement {
  type: 'list';
  listType: 'ordered' | 'unordered';
  markerStyle?: string;
  level: number;
  content: ListItemElement[];
}

export interface ListItemElement extends BaseElement {
  type: 'list-item';
  text?: string;
  level: number;
  content: DocumentElement[];
}

export type DocumentElement =
  | ParagraphElement
  | HeadingElement
  | ImageElement
  | ListElement
  | ListItemElement
  | TableElement
  | TextElement
  | (BaseElement & {
      type: Exclude<
        string,
        'paragraph' | 'heading' | 'image' | 'text' | 'list' | 'list-item'
      >;
    });

export interface TableElement extends BaseElement {
  rows: TableRowElement[];
}

export interface TableRowElement {
  cells: TableCellElement[];
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
}

export interface TableCellElement extends BaseElement {
  colspan?: number;
  rowspan?: number;
}

export type Middleware = (html: string) => Promise<string>;
export type TagHandler = (
  element: HTMLElement | ChildNode,
  options?: { [key: string]: any }
) => DocumentElement;
