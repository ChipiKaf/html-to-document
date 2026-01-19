import { ElementType } from 'packages/core/dist';
import type CSS from 'csstype';
import type PDFDocument from 'pdfkit/js/pdfkit.standalone';

export class StyleStack {
  constructor(
    private readonly doc: typeof PDFDocument,
    private readonly defaultStyles: Partial<
      Record<
        ElementType,
        Partial<Record<keyof CSS.Properties, string | number>>
      >
    >
  ) {}

  pushLayer(
    styles: Partial<
      Record<
        ElementType,
        Partial<Record<keyof CSS.Properties, string | number>>
      >
    >
  ) {
    // TODO: apply the new styles to the PDF document
  }

  popLayer() {
    // TODO: check which styles were changed in the current layer and revert them
  }
}
