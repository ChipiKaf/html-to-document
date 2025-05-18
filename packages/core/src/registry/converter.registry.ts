import { IDocumentConverter } from '../types';

export class ConverterRegistry {
  private _converters: Map<string, IDocumentConverter>;
  constructor() {
    this._converters = new Map();
  }

  public register(name: string, converter: IDocumentConverter) {
    this._converters.set(name, converter);
  }

  public get(name: string) {
    const converter = this._converters.get(name);
    if (!converter) console.warn(`Converter for ${name} not registered`);
    return converter;
  }
}
