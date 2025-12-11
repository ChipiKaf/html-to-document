import { Styles, StyleScope } from '../types';

export interface StyleMeta {
  /** Does this property naturally inherit (like CSS)? */
  inherits: boolean;
  /** At which scopes is this property valid? */
  scopes: StyleScope[];
  /** Which child scopes it can cascade into. */
  cascadeTo?: StyleScope[];
}

const STYLE_META: Record<string, StyleMeta> = {
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
  margin: {
    inherits: false,
    scopes: ['block'],
  },
  padding: {
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
};

export function getStyleMeta(property: string): StyleMeta {
  const meta = STYLE_META[property];
  if (meta) return meta;

  // Default to not inherited and valid everywhere
  // Mapper can still decide how to use it
  return {
    inherits: false,
    scopes: ['block', 'inline', 'table', 'tableRow', 'tableCell'],
  };
}

interface ComputeInheritedStylesOptions {
  parentStyles: Styles;
  parentScope: StyleScope;
  childScope: StyleScope;
}

/**
 * Filters styles that should be inherited by a child element from a parent element.
 */
export function computeInheritedStyles({
  parentStyles,
  parentScope,
  childScope,
}: ComputeInheritedStylesOptions): Styles {
  const result: Styles = {};

  for (const [prop, value] of Object.entries(parentStyles)) {
    const meta = getStyleMeta(prop);

    if (!meta.inherits) continue;
    if (!meta.scopes.includes(parentScope)) continue;

    const cascadeTargets = meta.cascadeTo ?? meta.scopes;
    if (!cascadeTargets.includes(childScope)) continue;

    result[prop] = value;
  }

  return result;
}

/**
 * Filters styles to only include those valid for a specific scope.
 */
export function filterForScope(
  styles: Styles,
  scope: StyleScope | undefined
): Styles {
  const result: Styles = {};
  const effectiveScope = scope ?? 'block';
  for (const [prop, value] of Object.entries(styles)) {
    const meta = getStyleMeta(prop);
    if (meta.scopes.includes(effectiveScope)) {
      result[prop] = value;
    }
  }
  return result;
}

export function registerStyleMeta(property: string, meta: Partial<StyleMeta>) {
  const existing = STYLE_META[property] ?? getStyleMeta(property);
  STYLE_META[property] = {
    ...existing,
    ...meta,
  };
}
