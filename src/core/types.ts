import * as CSS from 'csstype';
import { IDocumentConverter } from '../converters';
import { StyleMapper } from './style.mapper';
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

export interface GridCell {
  cell?: TableCellElement;
  horizontal?: boolean; // placeholder for a horizontally merged cell
  verticalMerge?: boolean; // placeholder for a vertically merged cell
  isMaster?: boolean; // indicates the starting (master) cell
}

export type Middleware = (html: string) => Promise<string>;
export type TagHandler = (
  element: HTMLElement | ChildNode,
  options?: { [key: string]: any }
) => DocumentElement;

export type TagHandlerObject = {
  key: keyof HTMLElementTagNameMap;
  handler: TagHandler;
};

export interface IConverterDependencies {
  styleMapper: StyleMapper;
  [key: string]: any;
}

export type StyleMapping = Partial<
  Record<keyof CSS.Properties, (value: string) => any>
>;
export type AdapterProvider = new (
  dependencies: IConverterDependencies
) => IDocumentConverter;

export type ConverterOptions = {
  tagHandlers?: TagHandlerObject[];
  adapters?: {
    format: string;
    adapter: IDocumentConverter;
    styleMapper: StyleMapper;
  }[];
  domParser?: IDOMParser;
};

export type InitOptions = {
  middleware?: Middleware[];
  tagHandlers?: TagHandlerObject[];
  clearMiddleware?: boolean;
  styleMappings?: {
    format: string;
    handlers: StyleMapping;
  }[];
  adapters?: {
    format: string;
    adapter: AdapterProvider;
  }[];
  domParser?: IDOMParser;
};
export interface IDOMParser {
  parse(html: string): Document;
}
