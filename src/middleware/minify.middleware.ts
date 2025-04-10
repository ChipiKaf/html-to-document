import { Middleware } from '../core';

// Define which tags are block–level and which are inline.
const blockTags = new Set(['div', 'p', 'ol', 'ul', 'li']);
const inlineTags = new Set(['span', 'strong']);

// Our very simple node structure.
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
  // Use a dummy root node.
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
      // Check for a closing tag.
      if (/^<\/\s*([a-zA-Z0-9]+)/.test(token)) {
        // Pop the stack (assume matching tag exists).
        stack.pop();
      } else {
        // Opening (or self-closing) tag.
        const isSelfClosing = /\/>$/.test(token);
        const tagMatch = token.match(/^<\s*([a-zA-Z0-9]+)/);
        const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
        const node: Node = {
          type: 'tag',
          tagName,
          raw: token, // preserve the original opening tag as-is
          isSelfClosing,
          children: [],
        };
        // Append to the current (top) node’s children.
        const parent = stack[stack.length - 1];
        if (parent.type === 'tag') {
          parent.children.push(node);
        }
        if (!isSelfClosing) {
          stack.push(node);
        }
      }
    } else {
      // Text node.
      const parent = stack[stack.length - 1];
      if (parent.type === 'tag') {
        parent.children.push({ type: 'text', content: token });
      }
    }
  }
  return root.type === 'tag' ? root.children : [];
}

/**
 * Determines if a tag is block-level.
 */
function isBlock(tag: string): boolean {
  return blockTags.has(tag);
}

/**
 * Determines if a tag is inline.
 */
function isInline(tag: string): boolean {
  return inlineTags.has(tag);
}

/**
 * Recursively processes a list of nodes and returns a minified string.
 *
 * @param nodes The node array.
 * @param parentTag If given, the tag name of the parent.
 */
function processNodes(nodes: Node[], parentTag?: string): string {
  const trimEdges = parentTag ? isBlock(parentTag) : true;

  const processed = nodes.map((node) => {
    if (node.type === 'text') {
      const collapsed = node.content.replace(/\s+/g, ' ');
      return { type: 'text' as const, text: collapsed };
    } else if (node.type === 'tag') {
      const inner = processNodes(node.children, node.tagName);
      const closingTag = node.isSelfClosing ? '' : `</${node.tagName}>`;
      return {
        type: 'tag' as const,
        text: `${node.raw}${inner}${closingTag}`,
        tagName: node.tagName,
      };
    } else {
      return { type: 'text' as const, text: '' };
    }
  });

  // Smart edge trimming and sibling-aware whitespace control
  for (let i = 0; i < processed.length; i++) {
    const item = processed[i];

    if (item.type === 'text') {
      const prev = processed[i - 1];
      const next = processed[i + 1];

      // Trim leading space if preceded by a block tag
      if (prev?.type === 'tag' && isBlock(prev.tagName)) {
        item.text = item.text.replace(/^\s+/, '');
      }

      // Instead of removing trailing space if followed by a block tag,
      // we now replace it with a single space.
      if (next?.type === 'tag' && isBlock(next.tagName)) {
        item.text = item.text.replace(/\s+$/, ' ');
      }

      // Trim leading space if first item and block parent
      if (i === 0 && trimEdges) {
        item.text = item.text.replace(/^\s+/, '');
      }

      // Trim trailing space if last item and block parent
      if (i === processed.length - 1 && trimEdges) {
        item.text = item.text.replace(/\s+$/, '');
      }
    }
  }

  const output = processed
    .map((item) => item.text)
    .filter((text) => text.trim() !== '')
    .join('');

  return output;
}

export const minifyMiddleware: Middleware = async (html: string) => {
  // 1. Remove HTML comments.
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // 2. Replace newlines and carriage returns with a space.
  html = html.replace(/\r?\n/g, ' ');

  // 3. Build a token tree.
  const nodes = parseHTML(html);

  // 4. Recursively process nodes.
  let result = processNodes(nodes);

  // 5. Remove any remaining whitespace between tags.
  result = result.replace(/>\s+</g, '><');

  // 6. Trim the overall string.
  return result.trim();
};
