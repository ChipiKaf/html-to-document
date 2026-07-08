import {
  createBaseStylesheet,
  createStylesheet,
  DocumentElement,
  IConverterDependencies,
  IDocumentConverter,
  IStylesheet,
  toHtml,
} from 'html-to-document-core';
import { HtmlAdapterConfig } from './html.types';

const DEFAULT_MIME_TYPE = 'text/html;charset=utf-8';

export class HtmlAdapter implements IDocumentConverter {
  private readonly defaultStyles: IConverterDependencies['defaultStyles'];
  private readonly stylesheet: IStylesheet;
  private readonly mimeType: string;

  constructor(
    dependencies: IConverterDependencies,
    config?: HtmlAdapterConfig
  ) {
    this.defaultStyles = { ...(dependencies.defaultStyles ?? {}) };
    this.stylesheet = dependencies.stylesheet ?? createBaseStylesheet();
    this.mimeType = config?.mimeType ?? DEFAULT_MIME_TYPE;
  }

  async convert(
    elements: DocumentElement[],
    stylesheet?: IStylesheet
  ): Promise<Buffer | Blob> {
    const html = toHtml(
      elements,
      this.defaultStyles,
      this.mergeStylesheet(stylesheet)
    );

    if (typeof window !== 'undefined') {
      return new Blob([html], { type: this.mimeType });
    }

    return Buffer.from(html, 'utf-8');
  }

  private mergeStylesheet(stylesheet?: IStylesheet): IStylesheet {
    if (!stylesheet) {
      return this.stylesheet;
    }

    return createStylesheet([
      ...this.stylesheet.getStatements(),
      ...stylesheet.getStatements(),
    ]);
  }
}
