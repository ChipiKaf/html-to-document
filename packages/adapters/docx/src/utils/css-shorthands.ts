export type QuadSides<T> = {
  top: T;
  right: T;
  bottom: T;
  left: T;
};

const splitCssTokens = (value: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of value.trim()) {
    if (/\s/.test(char) && parenDepth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')' && parenDepth > 0) parenDepth -= 1;
    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
};

export const expandQuadShorthand = <T>(
  value: T | readonly T[]
): QuadSides<T> | undefined => {
  const tokens = Array.isArray(value) ? [...value] : [value];
  if (tokens.length === 0) return undefined;

  const top = tokens[0]!;
  const right = tokens[1] ?? top;
  const bottom = tokens[2] ?? top;
  const left = tokens[3] ?? right;

  return {
    top,
    right,
    bottom,
    left,
  };
};

export const splitQuadShorthand = (
  value: string | number | undefined
): QuadSides<string | number> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return expandQuadShorthand(value);

  const tokens = splitCssTokens(value);

  return tokens.length > 0 ? expandQuadShorthand(tokens) : undefined;
};
