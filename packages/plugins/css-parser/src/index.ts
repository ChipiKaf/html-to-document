import * as csstree from 'css-tree';
import type {
  AtRule,
  OnDocumentContext,
  Plugin as DocumentPlugin,
  Styles,
  StylesheetStatement,
  StyleRule,
} from 'html-to-document-core';

export type CssParserPluginOptions = {
  removeStyleElements?: boolean;
};

export const cssParserPlugin = (
  options: CssParserPluginOptions = {}
): DocumentPlugin => ({
  name: 'css-parser',
  onDocument(context: OnDocumentContext) {
    const { removeStyleElements = true } = options;
    const styleElements = Array.from(
      context.document.querySelectorAll('style')
    ) as HTMLStyleElement[];

    for (const styleElement of styleElements) {
      const source = styleElement.textContent?.trim();
      if (!source) {
        if (removeStyleElements) {
          styleElement.remove();
        }
        continue;
      }

      for (const statement of parseStylesheet(source)) {
        context.stylesheet.add(statement);
      }

      if (removeStyleElements) {
        styleElement.remove();
      }
    }
  },
});

const parseStylesheet = (source: string): StylesheetStatement[] => {
  const stylesheet = csstree.parse(source, {
    context: 'stylesheet',
    positions: false,
  });

  if (stylesheet.type !== 'StyleSheet') {
    return [];
  }
  return stylesheet.children.toArray().flatMap((node) => toStatement(node));
};

const toStatement = (node: csstree.CssNode): StylesheetStatement[] => {
  switch (node.type) {
    case 'Rule':
      return [toStyleRule(node)];
    case 'Atrule':
      return [toAtRule(node)];
    default:
      return [];
  }
};

const toStyleRule = (rule: csstree.Rule): StyleRule => {
  const selectors =
    rule.prelude.type === 'SelectorList'
      ? rule.prelude.children
          .map((selector) => csstree.generate(selector))
          .toArray()
      : [csstree.generate(rule.prelude)];

  const declarations: Styles = {};
  const children: AtRule[] = [];

  for (const child of rule.block.children) {
    if (child.type === 'Declaration') {
      const declaration = child;
      declarations[toStylePropertyName(declaration.property)] = csstree
        .generate(declaration.value)
        .trim();
      continue;
    }

    if (child.type === 'Atrule') {
      children.push(toAtRule(child));
    }
  }

  return {
    kind: 'style',
    selectors,
    declarations,
    children: children.length > 0 ? children : undefined,
  };
};

const toAtRule = (rule: csstree.Atrule): AtRule => {
  const descriptors: Record<string, string> = {};
  const children: StylesheetStatement[] = [];

  if (rule.block?.type === 'Block') {
    for (const child of rule.block.children) {
      if (child.type === 'Declaration') {
        const declaration = child;
        descriptors[toStylePropertyName(declaration.property)] = csstree
          .generate(declaration.value)
          .trim();
        continue;
      }

      children.push(...toStatement(child));
    }
  }

  return {
    kind: 'at-rule',
    name: rule.name,
    prelude: rule.prelude
      ? csstree.generate(rule.prelude).trim() || undefined
      : undefined,
    descriptors: Object.keys(descriptors).length > 0 ? descriptors : undefined,
    children: children.length > 0 ? children : undefined,
  };
};

const toStylePropertyName = (property: string): Extract<keyof Styles, string> =>
  (property.startsWith('--')
    ? property
    : property.replace(/-([a-z])/g, (_, letter: string) =>
        letter.toUpperCase()
      )) as Extract<keyof Styles, string>;
