import { IDocumentConverter } from '../converters/IDocumentConverter';

export class ConverterRegistry {
  private _converters: Map<string, IDocumentConverter>;
  constructor() {
    this._converters = new Map();
  }

  public register(name: string, converter: IDocumentConverter) {
    this._converters.set(name, converter);
  }

  public get(name: string) {
    return this._converters.get(name);
  }
}
