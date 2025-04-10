import { Middleware } from '../core';

export const minifyMiddleware: Middleware = async (html: string) => {
  let output = html;
  // 1. Remove HTML comments.
  output = output.replace(/<!--.*?-->/gs, '');
  // 2. Replace newlines and carriage returns with a space.
  output = output.replace(/\r?\n|\r/g, ' ');
  // 3. Remove whitespace between tags.
  output = output.replace(/>\s+</g, '><');

  // 4. Process inline tags (<span>):
  //    Collapse multiple spaces but keep leading/trailing spaces as they were.
  output = output.replace(/<span>([\s\S]*?)<\/span>/g, (_, content) => {
    const collapsed = content.replace(/\s+/g, ' ');
    return `<span>${collapsed}</span>`;
  });

  // 5. Process block-level tags (<div> and <p>):
  //    Collapse multiple spaces and trim the text, removing accidental leading/trailing spaces.
  output = output.replace(/<(div|p)>([\s\S]*?)<\/\1>/g, (_, tag, content) => {
    const collapsed = content.replace(/\s+/g, ' ').trim();
    return `<${tag}>${collapsed}</${tag}>`;
  });

  // 6. Trim any extra whitespace at the very beginning and end.
  output = output.trim();
  return output;
};
