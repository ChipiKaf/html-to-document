import {
  Paragraph,
  Table,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  IPropertiesOptions,
} from 'docx';
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

type OptionalOptions = Omit<Partial<IPropertiesOptions>, 'sections'>;

export type DocxAdapterConfig = {
  blockConverters?: IBlockConverter[];
  inlineConverters?: IInlineConverter[];
  fallthroughConverters?: FallthroughConverter[];
  /**
   * Document options to pass to the docx Document constructor (from `docx`).
   * Can either be an object that overrides the default options, or a function that takes the default options and returns the modified options.
   */
  documentOptions?:
    | OptionalOptions
    | ((defaultOptions: OptionalOptions) => OptionalOptions);
};
