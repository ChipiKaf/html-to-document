import { IConverterDependencies, Styles } from '../types';
import { LEGACY_ELEMENT_TYPE_SELECTOR_ATTRIBUTE } from './constants';
import { StyleRule, IStylesheet } from './interfaces';
import { createStylesheet } from './sheet';

export const BUILT_IN_DEFAULT_STYLES: readonly {
  key: keyof HTMLElementTagNameMap;
  styles: Styles;
}[] = [
  { key: 'h1', styles: { fontSize: '32px', fontWeight: 'bold' } },
  { key: 'h2', styles: { fontSize: '24px', fontWeight: 'bold' } },
  { key: 'h3', styles: { fontWeight: 'bold' } },
  { key: 'h4', styles: { fontWeight: 'bold' } },
  { key: 'h5', styles: { fontWeight: 'bold' } },
  { key: 'h6', styles: { fontWeight: 'bold' } },
  {
    key: 'th',
    styles: {
      textAlign: 'center',
    },
  },
  {
    key: 'strong',
    styles: {
      fontWeight: 'bold',
    },
  },
  {
    key: 'b',
    styles: {
      fontWeight: 'bold',
    },
  },
  {
    key: 'em',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'i',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'cite',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'dfn',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'var',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'small',
    styles: {
      fontSize: '8px',
    },
  },
  {
    key: 'u',
    styles: {
      textDecoration: 'underline',
    },
  },
  {
    key: 'ins',
    styles: {
      textDecoration: 'underline',
    },
  },
  {
    key: 'sup',
    styles: {
      verticalAlign: 'super',
    },
  },
  {
    key: 'sub',
    styles: {
      verticalAlign: 'sub',
    },
  },
  {
    key: 'pre',
    styles: {
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
    },
  },
  {
    key: 'code',
    styles: {
      fontFamily: 'monospace',
      backgroundColor: 'lightGray',
    },
  },
  {
    key: 'kbd',
    styles: {
      fontFamily: 'monospace',
    },
  },
  {
    key: 'samp',
    styles: {
      fontFamily: 'monospace',
    },
  },
  {
    key: 'blockquote',
    styles: {
      borderLeftColor: 'lightGray',
      borderLeftStyle: 'solid',
      borderLeftWidth: 2,
      paddingLeft: '16px',
      marginLeft: '24px',
    },
  },
  {
    key: 'address',
    styles: {
      fontStyle: 'italic',
    },
  },
  {
    key: 'mark',
    styles: {
      backgroundColor: 'yellow',
    },
  },
  {
    key: 'figcaption',
    styles: {
      fontStyle: 'italic',
      textAlign: 'center',
    },
  },
  {
    key: 'caption',
    styles: {
      fontStyle: 'italic',
      textAlign: 'center',
    },
  },
  {
    key: 'dt',
    styles: {
      fontWeight: 'bold',
    },
  },
  {
    key: 'dd',
    styles: {
      marginLeft: '40px',
    },
  },
  {
    key: 's',
    styles: {
      textDecoration: 'line-through',
    },
  },
  {
    key: 'del',
    styles: {
      textDecoration: 'line-through',
    },
  },
] as const;

export function createBaseStylesheet(): IStylesheet {
  const stylesheet = createStylesheet();

  for (const { key, styles } of BUILT_IN_DEFAULT_STYLES) {
    stylesheet.addStyleRule(key, styles);
  }

  return stylesheet;
}

export function defaultStylesToStylesheetRules(
  defaultStyles: IConverterDependencies['defaultStyles'] = {}
): StyleRule[] {
  return Object.entries(defaultStyles).flatMap(
    ([elementType, elementStyles]) => {
      if (!elementStyles || Object.keys(elementStyles).length === 0) {
        return [];
      }

      return [
        {
          kind: 'style' as const,
          selectors: [
            `[${LEGACY_ELEMENT_TYPE_SELECTOR_ATTRIBUTE}="${elementType}"]`,
          ],
          declarations: { ...elementStyles },
        },
      ];
    }
  );
}

export function tagDefaultStylesToStylesheetRules(
  defaultStyles: readonly {
    key: keyof HTMLElementTagNameMap;
    styles: Styles;
  }[] = []
): StyleRule[] {
  return defaultStyles.flatMap(({ key, styles }) => {
    if (!styles || Object.keys(styles).length === 0) {
      return [];
    }

    return [
      {
        kind: 'style' as const,
        selectors: [key],
        declarations: { ...styles },
      },
    ];
  });
}
