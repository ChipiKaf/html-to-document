import { Middleware } from '../types';

// Define which tags are block–level and which are inline.
const blockTags = new Set(['div', 'p', 'ol', 'ul', 'li']);
const voidElements = new Set([
  'br',
  'img',
  'hr',
  'input',
  'link',
  'meta',
  'col',
]);

type Node =
  | {
      type: 'tag';
      tagName: string;
      raw: string;
      isSelfClosing: boolean;
      children: Node[];
    }
  | { type: 'text'; content: string };

/**
 * Splits the HTML into tokens (either tags or text) and builds a simple tree.
 * (Assumes well–formed HTML without comments.)
 */
function parseHTML(input: string): Node[] {
  const tokens = input.match(/(<[^>]+>|[^<]+)/g) || [];
  const root: Node = {
    type: 'tag',
    tagName: 'root',
    raw: '',
    isSelfClosing: false,
    children: [],
  };
  const stack: Node[] = [root];

  for (const token of tokens) {
    if (token.startsWith('<')) {
      if (/^<\/\s*([a-zA-Z0-9]+)/.test(token)) {
        stack.pop();
      } else {
        const tagMatch = token.match(/^<\s*([a-zA-Z0-9]+)/);
        const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
        const isSelfClosing = /\/>$/.test(token) || voidElements.has(tagName);
        const node: Node = {
          type: 'tag',
          tagName,
          raw: token,
          isSelfClosing,
          children: [],
        };
        const parent = stack[stack.length - 1];
        if (parent.type === 'tag') parent.children.push(node);
        if (!isSelfClosing) stack.push(node);
      }
    } else {
      const parent = stack[stack.length - 1];
      if (parent.type === 'tag') {
        parent.children.push({ type: 'text', content: token });
      }
    }
  }

  return root.children;
}

/**
 * Is this a block-level tag?
 */
function isBlock(tag: string): boolean {
  return blockTags.has(tag);
}

/**
 * Processes nodes and minifies, preserving `<pre>` whitespace.
 */
function processNodes(nodes: Node[], parentTag?: string): string {
  const isPre = parentTag === 'pre';

  // Map nodes to text, preserving raw whitespace inside <pre>
  const processed = nodes.map((node) => {
    if (node.type === 'text') {
      if (isPre) {
        return { type: 'text' as const, text: node.content };
      }
      // Outside <pre>: remove newlines and collapse spaces
      let text = node.content.replace(/\r?\n/g, ' ');
      text = text.replace(/\s+/g, ' ');
      return { type: 'text' as const, text };
    }

    // Tag node: recurse
    const inner = processNodes(node.children, node.tagName);
    const closing = node.isSelfClosing ? '' : `</${node.tagName}>`;
    return {
      type: 'tag' as const,
      text: `${node.raw}${inner}${closing}`,
      tagName: node.tagName,
    };
  });

  // If we're inside <pre>, just join raw text
  if (isPre) {
    return processed.map((item) => item.text).join('');
  }

  // Otherwise, smart trimming around block tags
  for (let i = 0; i < processed.length; i++) {
    const item = processed[i];
    if (item.type !== 'text') continue;

    const prev = processed[i - 1];
    const next = processed[i + 1];
    const trimEdges = parentTag ? isBlock(parentTag) : true;

    if (prev?.type === 'tag' && isBlock(prev.tagName)) {
      item.text = item.text.replace(/^\s+/, '');
    }
    if (next?.type === 'tag' && isBlock(next.tagName)) {
      item.text = item.text.replace(/\s+$/, ' ');
    }
    if (i === 0 && trimEdges) {
      item.text = item.text.replace(/^\s+/, '');
    }
    if (i === processed.length - 1 && trimEdges) {
      item.text = item.text.replace(/\s+$/, '');
    }
  }

  // Join, dropping purely-empty text nodes
  return processed
    .map((item) => item.text)
    .filter((t) => t.trim() !== '')
    .join('');
}

export const minifyMiddleware: Middleware = async (html: string) => {
  // 1. Strip comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Build a token tree (no global newline removal)
  const nodes = parseHTML(html);

  // 3. Minify, with <pre>-aware logic
  let result = processNodes(nodes);

  // 4. Remove leftover whitespace between tags
  result = result.replace(/>\s+</g, '><');

  // 5. Trim overall
  return result.trim();
};
