import {
  type ISectionPropertiesOptions,
  type IPageSizeAttributes,
  PageOrientation,
} from 'docx';
import type { AtRule, IStylesheet } from 'html-to-document-core';
import { splitQuadShorthand } from './utils/css-shorthands';
import { lengthToTwips } from './utils/parse';
import { TWIPS_PER_INCH, TWIPS_PER_MM } from './utils/unit-conversion';

export type PageOptions = NonNullable<ISectionPropertiesOptions['page']>;

type NormalizedPageRule = {
  /** as twips number */
  marginTop?: number;
  /** as twips number */
  marginRight?: number;
  /** as twips number */
  marginBottom?: number;
  /** as twips number */
  marginLeft?: number;
  size?:
    | {
        kind: 'code';
        code: number;
      }
    | {
        kind: 'explicit';
        /** as twips number */
        width: number;
        /** as twips number */
        height: number;
      };
  /** Is not set if explicit size is provided, otherwise can be set based on orientation or size code */
  orientation?: 'landscape' | 'portrait';
};

const docxSizeCodeMap: Record<string, number> = {
  letter: 1,
  ledger: 3,
  legal: 5,
  A3: 8,
  A4: 9,
  A5: 11,
  'JIS-B4': 12,
  'JIS-B5': 13,
  B4: 34,
  B5: 35,
} as const;

const docxCodeSizesMap: Record<
  /** docx code */
  number,
  {
    /** as twips number */
    width: number;
    /** as twips number */
    height: number;
  }
> = {
  1: { width: 8.5 * TWIPS_PER_INCH, height: 11 * TWIPS_PER_INCH },
  3: { width: 11 * TWIPS_PER_INCH, height: 17 * TWIPS_PER_INCH },
  5: { width: 8.5 * TWIPS_PER_INCH, height: 14 * TWIPS_PER_INCH },
  8: {
    width: Math.round(297 * TWIPS_PER_MM),
    height: Math.round(420 * TWIPS_PER_MM),
  },
  9: {
    width: Math.round(210 * TWIPS_PER_MM),
    height: Math.round(297 * TWIPS_PER_MM),
  },
  11: {
    width: Math.round(148 * TWIPS_PER_MM),
    height: Math.round(210 * TWIPS_PER_MM),
  },
  12: { width: 257 * TWIPS_PER_MM, height: 364 * TWIPS_PER_MM },
  13: { width: 182 * TWIPS_PER_MM, height: 257 * TWIPS_PER_MM },
  34: { width: 257 * TWIPS_PER_MM, height: 364 * TWIPS_PER_MM },
  35: { width: 182 * TWIPS_PER_MM, height: 257 * TWIPS_PER_MM },
} as const;

const normalizePageRules = (
  atRules: readonly AtRule<'page'>[]
): NormalizedPageRule => {
  const merged = atRules.reduce(
    (acc, r) => {
      return {
        ...acc,
        ...r.descriptors,
      };
    },
    {} as NonNullable<(typeof atRules)[number]['descriptors']>
  );

  const normalized: NormalizedPageRule = {};
  if (merged.margin) {
    const margins = splitQuadShorthand(merged.margin);
    if (margins) {
      normalized.marginTop = lengthToTwips(margins.top);
      normalized.marginRight = lengthToTwips(margins.right);
      normalized.marginBottom = lengthToTwips(margins.bottom);
      normalized.marginLeft = lengthToTwips(margins.left);
    }
  }

  if (merged.marginTop !== undefined)
    normalized.marginTop = lengthToTwips(merged.marginTop);
  if (merged.marginRight !== undefined)
    normalized.marginRight = lengthToTwips(merged.marginRight);
  if (merged.marginBottom !== undefined)
    normalized.marginBottom = lengthToTwips(merged.marginBottom);
  if (merged.marginLeft !== undefined)
    normalized.marginLeft = lengthToTwips(merged.marginLeft);

  const sizeSplitted = merged.size?.toString().split(/\s+/);
  // If last is "landscape" or "portrait", treat it as orientation, otherwise ignore
  if (sizeSplitted) {
    const sizeName = sizeSplitted[0];
    const sizeCode = sizeName ? docxSizeCodeMap[sizeName] : undefined;

    if (sizeCode) {
      normalized.size = { kind: 'code', code: sizeCode };
      const lastToken = sizeSplitted[sizeSplitted.length - 1]?.toLowerCase();
      if (lastToken === 'landscape' || lastToken === 'portrait') {
        normalized.orientation = lastToken;
        sizeSplitted.pop();
      }
    } else {
      const widthToken = sizeSplitted[0];
      const heightToken = sizeSplitted[1] ?? sizeSplitted[0]; // if only one value is provided, use it for both width and height
      const width = lengthToTwips(widthToken);
      const height = lengthToTwips(heightToken);
      if (width !== undefined && height !== undefined) {
        normalized.size = {
          kind: 'explicit',
          width,
          height,
        };
      }
    }
  }

  return normalized;
};

/**
 * Resolves the page options of a section: the `@page` rules of the style sheet
 * over the page options of the default section options.
 */
export const resolvePageOptions = (
  stylesheet: Pick<IStylesheet, 'getAtRules'>,
  defaultPage: PageOptions | undefined
): PageOptions => {
  const stylesheetPageRules = stylesheet.getAtRules('page');
  const defaultPageRules = stylesheetPageRules.filter((r) => !r.prelude);

  const validatedPageRules = normalizePageRules(defaultPageRules);

  // TODO: consider first page rules
  // const firstPageRules = stylesheetPageRules.filter(
  //   (r) => r.prelude === ':first'
  // );
  // const firstPageValidatedRules = normalizePageRules(firstPageRules);

  const pageSize: Partial<IPageSizeAttributes> | undefined =
    validatedPageRules.size?.kind === 'code'
      ? {
          code: validatedPageRules.size.code,
          orientation: validatedPageRules.orientation,
          width: docxCodeSizesMap[validatedPageRules.size.code]?.width,
          height: docxCodeSizesMap[validatedPageRules.size.code]?.height,
        }
      : validatedPageRules.size?.kind === 'explicit'
        ? {
            width: validatedPageRules.size.width,
            height: validatedPageRules.size.height,
          }
        : undefined;

  return {
    ...defaultPage,
    margin: {
      ...defaultPage?.margin,
      // TODO: consider supporting unitless numbers
      top:
        validatedPageRules.marginTop !== undefined
          ? validatedPageRules.marginTop
          : defaultPage?.margin?.top,
      right:
        validatedPageRules.marginRight !== undefined
          ? validatedPageRules.marginRight
          : defaultPage?.margin?.right,
      bottom:
        validatedPageRules.marginBottom !== undefined
          ? validatedPageRules.marginBottom
          : defaultPage?.margin?.bottom,
      left:
        validatedPageRules.marginLeft !== undefined
          ? validatedPageRules.marginLeft
          : defaultPage?.margin?.left,
    },
    size: {
      ...defaultPage?.size,
      // TODO: add supprot for size values like "A4", "Letter", etc. and also numbers with units
      ...pageSize,
    },
  };
};

/** The page size and margins `docx` writes when a section doesn't set them, in twips. */
const DOCX_PAGE_DEFAULTS = {
  width: 11906,
  height: 16838,
  marginLeft: 1440,
  marginRight: 1440,
} as const;

/**
 * The width between the left and right margins of a page, in twips. Block
 * widths given as percentages, such as a table's, resolve against it.
 */
export const getPageContentWidth = ({ size, margin }: PageOptions): number => {
  // `docx` takes the portrait size and swaps it for a landscape page
  const width =
    size?.orientation === PageOrientation.LANDSCAPE
      ? toTwips(size.height, DOCX_PAGE_DEFAULTS.height)
      : toTwips(size?.width, DOCX_PAGE_DEFAULTS.width);
  return (
    width -
    toTwips(margin?.left, DOCX_PAGE_DEFAULTS.marginLeft) -
    toTwips(margin?.right, DOCX_PAGE_DEFAULTS.marginRight)
  );
};

const toTwips = (
  value: number | string | undefined,
  fallback: number
): number =>
  (typeof value === 'number' ? value : lengthToTwips(value)) ?? fallback;
