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
