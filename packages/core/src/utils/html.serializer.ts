import {
  DocumentElement,
  ImageElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  HeadingElement,
  ListElement,
  IConverterDependencies,
} from '../types';

/**
 * Serialize an array of DocumentElement back into an HTML string.
 *
 * @param elements Array of DocumentElement to serialize.
 * @returns HTML string representing the original HTML.
 */
export function toHtml(
  elements: DocumentElement[],
  defaultStyles: IConverterDependencies['defaultStyles'] = {}
): string {
  // If parser attached the original HTML, return it directly for exact round-trip
  // const original = (elements as any).__originalHtml;
  // if (typeof original === 'string') {
  //   return original;
  // }
  const html = elements
    .map((el) => elementToHtml(el, defaultStyles))
    .join('\n');
  return `<div>\n${html}\n</div>`;
}

// ---------------------------------------------------------------------------
// Helper utilities for deterministic HTML reconstruction
// ---------------------------------------------------------------------------
/** Map of “semantic‑default” styles we injected during parsing that
 *  should NOT be re‑emitted when serialising back to raw HTML.  */
const defaultTagStyles: Record<string, Record<string, string | number>> = {
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  sup: { verticalAlign: 'super' },
  sub: { verticalAlign: 'sub' },
  h1: { fontSize: '32px', fontWeight: 'bold' },
  h2: { fontSize: '24px', fontWeight: 'bold' },
  h3: { fontWeight: 'bold' },
  h4: { fontWeight: 'bold' },
  h5: { fontWeight: 'bold' },
  h6: { fontWeight: 'bold' },
  code: { backgroundColor: 'lightGray' },
  blockquote: {
    borderLeftColor: 'lightGray',
    borderLeftStyle: 'solid',
    borderLeftWidth: 2,
    paddingLeft: '16px',
    marginLeft: '24px',
  },
  th: { textAlign: 'center' },
};

const camelToKebab = (key: string) =>
  key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const encodeText = (txt: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '©': '&copy;',
    '—': '&mdash;',
  };
  return txt.replace(/[&<>©—]/g, (c) => map[c] ?? c);
};

const encodeAttr = (val: string | number): string =>
  String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function filterStyles(tag: string, styles: Record<string, string | number>) {
  const filtered: Record<string, string | number> = {};
  const defaults = defaultTagStyles[tag] ?? {};
  Object.entries(styles).forEach(([k, v]) => {
    if (defaults[k] !== v) {
      filtered[k] = v;
    }
  });
  return filtered;
}

const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function elementToHtml(
  el: DocumentElement,
  defaults: IConverterDependencies['defaultStyles'] = {}
): string {
  // -----------------------------------------------------------------------
  // Resolve tag name
  // -----------------------------------------------------------------------
  let tagName = (el.metadata?.tagName as string | undefined) ?? undefined;

  if (!tagName) {
    switch (el.type) {
      case 'paragraph':
        tagName = 'p';
        break;
      case 'heading':
        tagName = `h${(el as HeadingElement).level ?? 1}`;
        break;
      case 'list':
        tagName = (el as ListElement).listType === 'ordered' ? 'ol' : 'ul';
        break;
      case 'list-item':
        tagName = 'li';
        break;
      case 'image':
        tagName = 'img';
        break;
      case 'line':
        tagName = 'hr';
        break;
      case 'table':
        tagName = 'table';
        break;
      case 'header':
        tagName = 'header';
        break;
      case 'footer':
        tagName = 'footer';
        break;
      case 'page':
        tagName = 'section';
        break;
      case 'page-break':
        tagName = 'section';
        break;
      case 'table-row':
        tagName = 'tr';
        break;
      case 'table-cell':
        // default to td, we may override with metadata below
        tagName = 'td';
        break;
      case 'text':
        // Pure text node – no enclosing tag
        return encodeText(el.text ?? '');
      default:
        tagName = 'span';
    }
  }

  // -----------------------------------------------------------------------
  // Build attribute list
  // -----------------------------------------------------------------------
  const attrs: string[] = [];

  // 1. normal attributes (respect insertion order ― no sorting!)
  if (el.attributes) {
    Object.keys(el.attributes).forEach((key) => {
      const val = el.attributes![key]!;
      attrs.push(`${key}="${encodeAttr(val)}"`);
    });
  }

  // 2. colspan / rowspan when present
  if ('colspan' in el && typeof el.colspan === 'number' && el.colspan! > 1) {
    attrs.push(`colspan="${el.colspan}"`);
  }
  if ('rowspan' in el && typeof el.rowspan === 'number' && el.rowspan! > 1) {
    attrs.push(`rowspan="${el.rowspan}"`);
  }

  // 3. src for images (avoid duplicate if already in attributes)
  if (
    tagName === 'img' &&
    (el as ImageElement).src &&
    !(el.attributes && 'src' in el.attributes)
  ) {
    attrs.push(`src="${encodeAttr((el as ImageElement).src)}"`);
  }

  // 4. style attribute – merge defaults and filter out semantic defaults first
  const mergedStyles = {
    ...(defaults?.[el.type] || {}),
    ...(el.styles || {}),
  } as Record<string, string | number>;
  if (Object.keys(mergedStyles).length) {
    const filtered = filterStyles(tagName, mergedStyles);
    const styleEntries = Object.entries(filtered).map(([k, v]) => {
      return `${camelToKebab(k)}: ${v}`;
    });
    if (styleEntries.length) {
      const styleAttr = `style="${styleEntries.join('; ')};"`;
      if (tagName === 'table') {
        attrs.unshift(styleAttr);
      } else {
        attrs.push(styleAttr);
      }
    }
  }

  const attrString = attrs.length ? ' ' + attrs.join(' ') : '';

  // special-case code tags: preserve raw content without escaping
  if (tagName === 'code') {
    const innerCode =
      Array.isArray(el.content) && el.content.length
        ? (el.content as DocumentElement[]).map((c) => c.text ?? '').join('')
        : (el.text ?? '');
    return `<${tagName}${attrString}>${innerCode}</${tagName}>`;
  }

  // -----------------------------------------------------------------------
  // Self‑closing / void tags
  // -----------------------------------------------------------------------
  if (voidTags.has(tagName)) {
    return `<${tagName}${attrString}>`;
  }

  // -----------------------------------------------------------------------
  // Inner HTML (special handling for tables)
  // -----------------------------------------------------------------------
  let inner = '';

  if (el.type === 'table') {
    const table = el as TableElement;
    const theadRows: string[] = [];
    const tbodyRows: string[] = [];

    (table.rows ?? []).forEach((row: TableRowElement) => {
      const isHeader = row.cells.every((c) => c.styles?.textAlign === 'center');
      const cellsHtml = row.cells
        .map((c) => cellToHtml(c, defaults))
        .join('\n');
      const rowHtml = `<tr>\n${cellsHtml}\n</tr>`;
      (isHeader ? theadRows : tbodyRows).push(rowHtml);
    });

    if (theadRows.length) {
      inner += `\n<thead>\n${theadRows.join('\n')}\n</thead>`;
    }
    if (tbodyRows.length) {
      inner += `\n<tbody>\n${tbodyRows.join('\n')}\n</tbody>`;
    }
    if (el.content && el.content.length) {
      inner += `\n${(el.content as DocumentElement[])
        .map((c) => elementToHtml(c, defaults))
        .join('\n')}`;
    }
    inner += '\n';
  } else if (Array.isArray(el.content) && el.content.length) {
    inner = el.content.map((c) => elementToHtml(c, defaults)).join('');
  } else if (typeof el.text === 'string') {
    inner = encodeText(el.text);
  }

  return `<${tagName}${attrString}>${inner}</${tagName}>`;
}

/* -------------------------------------------------------------
 * helpers for table serialisation
 * ----------------------------------------------------------- */
function cellToHtml(
  cell: TableCellElement,
  defaults: IConverterDependencies['defaultStyles'] = {}
): string {
  const tag = cell.styles?.textAlign === 'center' ? 'th' : 'td';
  // basic attrs
  const attrs: string[] = [];
  if (typeof cell.colspan === 'number' && cell.colspan > 1)
    attrs.push(`colspan="${cell.colspan}"`);
  if (typeof cell.rowspan === 'number' && cell.rowspan > 1)
    attrs.push(`rowspan="${cell.rowspan}"`);
  const merged = {
    ...(defaults?.['table-cell'] || {}),
    ...(cell.styles || {}),
  } as Record<string, string | number>;
  if (Object.keys(merged).length) {
    const styleEntries = Object.entries(filterStyles(tag, merged)).map(
      ([k, v]) => `${camelToKebab(k)}: ${v}`
    );
    if (styleEntries.length) {
      attrs.push(`style="${styleEntries.join('; ')};"`);
    }
  }
  const attrString = attrs.length ? ' ' + attrs.join(' ') : '';
  const inner =
    Array.isArray(cell.content) && cell.content.length
      ? cell.content.map((c) => elementToHtml(c, defaults)).join('')
      : typeof cell.text === 'string'
        ? encodeText(cell.text)
        : '';
  return `<${tag}${attrString}>${inner}</${tag}>`;
}
