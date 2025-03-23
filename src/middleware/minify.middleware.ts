import { Middleware } from '../core';

export const minifyMiddleware: Middleware = async (html: string) => {
  return html
    .replace(/<!--.*?-->/gs, '') // Remove HTML comments
    .replace(/\r?\n|\r/g, ' ') // Remove newlines
    .replace(/>\s+/g, '>') // Remove whitespace after tags
    .replace(/\s+</g, '<') // Remove whitespace before tags
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim();
};
