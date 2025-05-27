import { DocumentRenderer } from './spatial.types';
import { DocxRenderer } from './renderers/docx.renderer';
import { PdfRenderer } from './renderers/pdf.renderer';

/**
 * Registry for document renderers that can extract spatial layout information
 */
export class RendererRegistry {
  private static instance: RendererRegistry;
  private renderers: DocumentRenderer[] = [];

  private constructor() {
    this.registerDefaultRenderers();
  }

  public static getInstance(): RendererRegistry {
    if (!RendererRegistry.instance) {
      RendererRegistry.instance = new RendererRegistry();
    }
    return RendererRegistry.instance;
  }

  /**
   * Register default renderers for common document formats
   */
  private registerDefaultRenderers(): void {
    this.register(new DocxRenderer());
    this.register(new PdfRenderer());
  }

  /**
   * Register a new document renderer
   */
  public register(renderer: DocumentRenderer): void {
    // Remove existing renderer for the same format
    this.renderers = this.renderers.filter(
      (r) => r.getFormat() !== renderer.getFormat()
    );
    this.renderers.push(renderer);
  }

  /**
   * Get renderer for a specific format
   */
  public getRenderer(format: string): DocumentRenderer | null {
    return this.renderers.find((r) => r.getFormat() === format) || null;
  }

  /**
   * Find the appropriate renderer for a document buffer
   */
  public findRenderer(buffer: Buffer): DocumentRenderer | null {
    return this.renderers.find((r) => r.canHandle(buffer)) || null;
  }

  /**
   * Get all registered renderers
   */
  public getAllRenderers(): DocumentRenderer[] {
    return [...this.renderers];
  }

  /**
   * Get all supported formats
   */
  public getSupportedFormats(): string[] {
    return this.renderers.map((r) => r.getFormat());
  }
}
