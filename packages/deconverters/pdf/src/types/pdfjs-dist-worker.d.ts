declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs?url' {
  const src: string; // the emitted URL
  export default src;
}

/**
 * Shim modules that the pdf‑deconverter imports so the TypeScript compiler
 * recognises them.  They are provided by pdfjs‑dist at build time.
 */

// Modern worker – resolves `import 'pdfjs-dist/build/pdf.worker.mjs?url'`
declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const src: string; // emitted URL for the worker script
  export default src;
}

// Legacy worker (kept for backwards compatibility)
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs?url' {
  const src: string;
  export default src;
}

// Modern ESM bundle – re‑export the public types from the root package
declare module 'pdfjs-dist/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}

// Legacy ESM bundle
declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}
