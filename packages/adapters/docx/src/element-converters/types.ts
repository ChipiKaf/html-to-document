import { IConverterDependencies, StyleMapper } from 'html-to-document-core';
import { ElementConverter } from './converter';

export type ElementConverterDependencies = {
  styleMapper: StyleMapper;
  converter: ElementConverter;
  defaultStyles: IConverterDependencies['defaultStyles'];
};
