import { ConverterRegistry } from '../src/registry';
import { IDocumentConverter } from '../src/types';

class DummyConverter implements IDocumentConverter {
  async convert(): Promise<Buffer> {
    return Buffer.from('dummy');
  }
}

describe('ConverterRegistry', () => {
  let registry: ConverterRegistry;

  beforeEach(() => {
    registry = new ConverterRegistry();
  });

  it('registers and retrieves a converter by name', () => {
    const converter = new DummyConverter();
    registry.register('test-format', converter);
    expect(registry.get('test-format')).toBe(converter);
  });

  it('warns and returns undefined when converter not registered', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    expect(registry.get('nonexistent')).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Converter for nonexistent not registered');
    spy.mockRestore();
  });

  it('overwrites existing converter when registering the same name', () => {
    const first = new DummyConverter();
    const second = new DummyConverter();
    registry.register('duplicate', first);
    registry.register('duplicate', second);
    expect(registry.get('duplicate')).toBe(second);
  });

  it('can register multiple converters and retrieve them independently', () => {
    const converterA = new DummyConverter();
    const converterB = new DummyConverter();
    registry.register('formatA', converterA);
    registry.register('formatB', converterB);

    expect(registry.get('formatA')).toBe(converterA);
    expect(registry.get('formatB')).toBe(converterB);
  });
});
