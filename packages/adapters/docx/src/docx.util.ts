import {
  TextRun,
  ImageRun,
  MathRun,
  Paragraph,
  Table,
  ExternalHyperlink,
} from 'docx';
import { DocumentElement, Styles } from 'html-to-document-core';
import { DocxElement } from './docx.types';

// --- Utility Functions ---
export function mergeStyles(...sources: Styles[]): Styles {
  return Object.assign({}, ...sources.filter(Boolean));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  let binaryString: string;
  if (typeof Buffer !== 'undefined') {
    binaryString = Buffer.from(base64, 'base64').toString('binary');
  } else if (typeof atob === 'function') {
    binaryString = atob(base64);
  } else {
    throw new Error('Unable to decode base64 string');
  }
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
  if (typeof input === 'string') {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(input, encoding);
    }
    try {
      return base64ToUint8Array(input);
    } catch {
      return new Uint8Array();
    }
  }
  // For ArrayBuffer input, always return a Uint8Array
  return new Uint8Array(input);
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
