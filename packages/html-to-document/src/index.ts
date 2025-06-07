import { init as initCore, InitOptions } from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-adapter-docx';

/**
 * Initialize a Converter with the DOCX adapter pre-registered.
 * Additional adapters provided in options will be merged.
 */
export const init = (options: InitOptions = {}) => {
  const register = options.adapters?.register ? [...options.adapters.register] : [];
  const hasDocx = register.some(r => r.format === 'docx');
  if (!hasDocx) {
    register.push({ format: 'docx', adapter: DocxAdapter });
  }
  return initCore({
    ...options,
    adapters: {
      ...options.adapters,
      register,
    },
  });
};

export * from 'html-to-document-adapter-docx';
export * from 'html-to-document-core';
