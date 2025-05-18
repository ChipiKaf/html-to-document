import { StyleMapper } from '../style.mapper';

export class StyleMapperRegistry {
  private _mapper: Map<string, StyleMapper>;
  constructor() {
    this._mapper = new Map();
  }

  public register(name: string, mapper: StyleMapper) {
    this._mapper.set(name, mapper);
  }

  public get(name: string) {
    const converter = this._mapper.get(name);
    if (!converter) console.warn(`Mapper for ${name} not registered`);
    return converter;
  }
}
