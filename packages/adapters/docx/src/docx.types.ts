import { Paragraph, Table, TextRun, ImageRun, ExternalHyperlink } from 'docx';
import {
  FallthroughConverter,
  IBlockConverter,
  IInlineConverter,
} from './element-converters/types';

export type DocxElement =
  | Paragraph
  | Table
  | TextRun
  | ImageRun
  | ExternalHyperlink;

export type Config = {
  blockConverters?: IBlockConverter[];
  inlineConverters?: IInlineConverter[];
  fallthroughConverters?: FallthroughConverter[];
};
