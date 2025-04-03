import * as CSS from 'csstype';
// @To-do: Consider making the conversion from px or any other size extensible
export class StyleMapper {
  // Use Partial to only require a subset of the CSS properties
  protected mappings: Partial<
    Record<keyof CSS.Properties, (value: string) => any>
  > = {};

  constructor() {
    this.initializeDefaultMappings();
  }

  // Central place for all default mappings
  protected initializeDefaultMappings(): void {
    this.mappings = {
      fontWeight: (value: string) => (value === 'bold' ? { bold: true } : {}),
      fontStyle: (value: string) =>
        value === 'italic' ? { italics: true } : {},
      textDecoration: (value: string) =>
        value === 'underline' ? { underline: true } : {},
      color: (value: string) => ({ color: value.replace('#', '') }),
      backgroundColor: (value: string) => ({
        highlight: value.replace('#', ''),
      }),
      fontSize: (value: string) => {
        // Handle pixel values (e.g., "16px")
        if (value.endsWith('px')) {
          const px = parseFloat(value.slice(0, -2));
          const halfPoints = Math.round(px * 1.5);
          return { size: halfPoints };
        }
        // Handle percentage values (e.g., "150%")
        else if (value.endsWith('%')) {
          const percentage = parseFloat(value.slice(0, -1));
          // Assume a base font size of 16px
          const basePx = 16;
          const computedPx = (percentage / 100) * basePx;
          const halfPoints = Math.round(computedPx * 1.5);
          return { size: halfPoints };
        }
        // Fallback: if the value is a plain number, assume it's in pixels
        else {
          const numeric = parseFloat(value);
          if (!isNaN(numeric)) {
            const halfPoints = Math.round(numeric * 1.5);
            return { size: halfPoints };
          }
        }
        return {};
      },
    };
  }

  // Method to map raw styles to a generic style object
  public mapStyles(
    rawStyles: Partial<Record<keyof CSS.Properties, string>>
  ): Record<string, any> {
    return (Object.keys(rawStyles) as (keyof CSS.Properties)[]).reduce(
      (acc, cssProp) => {
        const mapper = this.mappings[cssProp];
        if (mapper) {
          return { ...acc, ...mapper(rawStyles[cssProp] as string) };
        }
        // Optionally log or ignore unmapped styles
        return acc;
      },
      {}
    );
  }

  // Method to add or override a mapping
  public addMapping(
    mappings: Partial<Record<keyof CSS.Properties, (value: string) => any>>
  ): void {
    Object.entries(mappings).forEach((entries) => {
      this.mappings[entries[0] as keyof CSS.Properties] = entries[1];
    });
  }
}
