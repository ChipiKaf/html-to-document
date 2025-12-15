import { DocumentElement, Styles } from 'html-to-document-core';
import { DocxElement } from './docx.types';
import { IImageOptions } from 'docx';

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
        if (!handler) {
          // TODO: Better handling here
          return [];
        }
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

export const supportedImageTypes = [
  'png',
  'jpg',
  'gif',
  'bmp',
  'svg',
] as const satisfies IImageOptions['type'][];

export type SupportedImageType = (typeof supportedImageTypes)[number];

export const parseImageType = (input: string): SupportedImageType | null => {
  const lowerInput = input.toLowerCase();
  if (supportedImageTypes.includes(lowerInput as IImageOptions['type'])) {
    return lowerInput as SupportedImageType;
  }
  if (lowerInput === 'jpeg') {
    return 'jpg';
  }
  if (lowerInput === 'svg+xml') {
    return 'svg';
  }
  return null;
};

export const isSupportedImageType = <S>(
  type: S
): type is Extract<S, SupportedImageType> => {
  return supportedImageTypes.includes(type as IImageOptions['type']);
};

export const promiseAllFlat = async <T>(
  items: (Promise<T[]> | T[])[]
): Promise<T[]> => {
  const results = await Promise.all(items);
  return results.flat();
};
