import { Paragraph, Table, TextRun, ImageRun, ExternalHyperlink } from 'docx';

export type DocxElement =
  | Paragraph
  | Table
  | TextRun
  | ImageRun
  | ExternalHyperlink;
