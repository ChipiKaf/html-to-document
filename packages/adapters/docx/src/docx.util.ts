import {
  TextRun,
  ImageRun,
  MathRun,
  Paragraph,
  Table,
  ExternalHyperlink,
} from 'docx';
import { DocumentElement, Styles } from '@html-to-document/core';
import { DocxElement } from './docx.types';

// --- Utility Functions ---
export function mergeStyles(...sources: Styles[]): Styles {
  return Object.assign({}, ...sources.filter(Boolean));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Types for possible docx elements returned by handlers

export async function handleChildren(
  handlerMap: Record<
    string,
    (
      el: DocumentElement,
      styles: Styles
    ) => Promise<DocxElement | DocxElement[]>
  >,
  children: DocumentElement[] = [],
  mergedStyles: Styles = {},
  ...extraStyles: Styles[]
): Promise<DocxElement[]> {
  return (
    await Promise.all(
      children.map((child) => {
        const handler = handlerMap[child.type] || handlerMap.custom;
        // Always pass a Styles object (never undefined)
        return handler(child, mergeStyles(mergedStyles, ...extraStyles));
      })
    )
  ).flat();
}

export function toBinaryBuffer(
  input: string | ArrayBuffer,
  encoding: BufferEncoding = 'base64'
): Buffer | Uint8Array {
  if (typeof Buffer !== 'undefined') {
    if (typeof input === 'string') {
      return Buffer.from(input, encoding);
    } else {
      return Buffer.from(input);
    }
  } else {
    if (typeof input === 'string') {
      return base64ToUint8Array(input);
    } else {
      return new Uint8Array(input);
    }
  }
}

export const isInline = (
  el: TextRun | ImageRun | MathRun | Paragraph | Table
) => {
  if (
    el instanceof TextRun ||
    el instanceof ImageRun ||
    el instanceof MathRun ||
    el instanceof ExternalHyperlink
  )
    return true;
  return false;
};
