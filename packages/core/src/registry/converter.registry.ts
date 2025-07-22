import { IDocumentConverter } from '../types';

export class ConverterRegistry {
  private _converters: Map<string, IDocumentConverter>;
  constructor() {
    this._converters = new Map();
  }

  public register(format: string, converter: IDocumentConverter) {
    this._converters.set(format, converter);
  }

  /**
   * Gets a converter by its format.
   * @example
   * ```typescript
   * const converter = registry.get('docx');
   * ```
   */
  public get(format: string) {
    const converter = this._converters.get(format);
    if (!converter) console.warn(`Converter for ${format} not registered`);
    return converter;
  }
}
