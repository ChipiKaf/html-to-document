import { StyleMeta, Styles, StyleScope } from '../types';
import * as CSS from 'csstype';

const DEFAULT_STYLE_META: Partial<Record<keyof CSS.Properties, StyleMeta>> = {
  // Typography
  fontFamily: {
    inherits: true,
    scopes: ['block', 'inline', 'tableCell'],
    cascadeTo: ['block', 'inline'],
  },
  fontSize: {
    inherits: true,
    scopes: ['block', 'inline', 'tableCell'],
    cascadeTo: ['block', 'inline'],
  },
  color: {
    inherits: true,
    scopes: ['block', 'inline', 'tableCell'],
    cascadeTo: ['block', 'inline'],
  },
  textAlign: {
    inherits: true,
    scopes: ['block', 'tableCell'],
    cascadeTo: ['block'],
  },

  // Layout / box-model (NOT inherited)
  border: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderTop: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderRight: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderBottom: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderLeft: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  // Border Widths
  borderWidth: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderTopWidth: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderRightWidth: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderBottomWidth: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderLeftWidth: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  // Border Colors
  borderColor: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderTopColor: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderRightColor: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderBottomColor: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderLeftColor: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  // Border Styles
  borderStyle: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderTopStyle: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderRightStyle: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderBottomStyle: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  borderLeftStyle: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  margin: {
    inherits: false,
    scopes: ['block'],
  },
  marginTop: {
    inherits: false,
    scopes: ['block'],
  },
  marginRight: {
    inherits: false,
    scopes: ['block'],
  },
  marginBottom: {
    inherits: false,
    scopes: ['block'],
  },
  marginLeft: {
    inherits: false,
    scopes: ['block'],
  },
  padding: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  paddingTop: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  paddingRight: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  paddingBottom: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  paddingLeft: {
    inherits: false,
    scopes: ['tableCell', 'block', 'table'],
  },
  backgroundColor: {
    inherits: false,
    scopes: ['block', 'tableCell', 'table'],
  },
  width: {
    inherits: false,
    scopes: ['table', 'tableCell', 'block'],
  },
  height: {
    inherits: false,
    scopes: ['table', 'tableCell', 'block'],
  },
  verticalAlign: {
    inherits: false,
    scopes: ['tableCell', 'inline'],
  },
} as const;

export function getStyleMeta(
  property: keyof CSS.Properties,
  metaRegistry = DEFAULT_STYLE_META
): StyleMeta {
  const meta = metaRegistry[property];
  if (meta) return meta;

  // Default to not inherited and valid everywhere
  // Mapper can still decide how to use it
  return {
    inherits: false,
    scopes: ['block', 'inline', 'table', 'tableRow', 'tableCell'],
  };
}

/**
 * Returns a fresh [deep] copy of the default style meta registry.
 */
export function initStyleMeta(): Partial<
  Record<keyof CSS.Properties, StyleMeta>
> {
  const meta: Partial<Record<keyof CSS.Properties, StyleMeta>> = {};
  for (const [k, v] of Object.entries(DEFAULT_STYLE_META)) {
    const key = k as keyof CSS.Properties;
    if (v) {
      meta[key] = {
        ...v,
        scopes: [...v.scopes],
        cascadeTo: v.cascadeTo ? [...v.cascadeTo] : undefined,
      };
    }
  }
  return meta;
}

interface ComputeInheritedStylesOptions {
  parentStyles: Styles;
  parentScope: StyleScope;
  childScope: StyleScope;
  metaRegistry?: Partial<Record<keyof CSS.Properties, StyleMeta>>;
}

/**
 * Filters styles that should be inherited by a child element from a parent element.
 * Often used by the distributor to compute styles for a child element.
 * Responsibility: "I have styles (like a border), but I also need to tell my children (cells/paragraphs) what styles they should inherit."
 * The Action: When processing a child cell, it calculates: "I have a border, but my child (a paragraph) should NOT inherit it. However, I have a font-family, and my child SHOULD inherit that."
 * It actively calculates the waterfall from Parent (tableCell) to Child (block).
 */
export function computeInheritedStyles({
  parentStyles,
  parentScope,
  childScope,
  metaRegistry,
}: ComputeInheritedStylesOptions): Styles {
  const result: Styles = {};

  for (const [prop, value] of Object.entries(parentStyles)) {
    const key = prop as keyof CSS.Properties;
    const meta = getStyleMeta(key, metaRegistry);

    if (!meta.inherits) continue;
    if (!meta.scopes.includes(parentScope)) continue;

    const cascadeTargets = meta.cascadeTo ?? meta.scopes;
    if (!cascadeTargets.includes(childScope)) continue;

    result[key] = value;
  }

  return result;
}

/**
 * Filters styles to only include those valid for a specific scope.
 * This is often used by the end consumer to filter styles for a specific scope, i.e the leaf element.
 * Responsibility: "I need to render myself right now."
 * The Action: It takes all the styles it received (cascaded from parents) and its own styles, and it asks: "Which of these are valid for me (a block)?"
 * It filters the inputs to ensure it doesn't try to apply invalid properties (like a table border) to itself.
 */
export function filterForScope(
  styles: Styles,
  scope: StyleScope | undefined,
  metaRegistry?: Partial<Record<keyof CSS.Properties, StyleMeta>>
): Styles {
  const result: Styles = {};
  const effectiveScope = scope ?? 'block';
  for (const [prop, value] of Object.entries(styles)) {
    const key = prop as keyof CSS.Properties;
    const meta = getStyleMeta(key, metaRegistry);
    if (meta.scopes.includes(effectiveScope)) {
      result[key] = value;
    }
  }
  return result;
}
