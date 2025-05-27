// Export main types
export * from './spatial.types';

// Export core comparison utilities
export {
  LayoutComparator,
  DEFAULT_COMPARISON_CONFIG,
} from './layout.comparator';

// Export renderers
export { DocxRenderer } from './renderers/docx.renderer';
export { PdfRenderer } from './renderers/pdf.renderer';

// Export registry
export { RendererRegistry } from './renderer.registry';

// Export test utilities
export { VisualTestUtils } from './visual.test.utils';
