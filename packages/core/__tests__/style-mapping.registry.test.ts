import { StyleMapperRegistry } from '../src/registry';
import { StyleMapper } from '../src/style.mapper';

describe('StyleMapperRegistry', () => {
  let registry: StyleMapperRegistry;
  beforeEach(() => {
    registry = new StyleMapperRegistry();
  });

  it('registers and retrieves a mapper by name', () => {
    const mapper = new StyleMapper();
    registry.register('test', mapper);
    expect(registry.get('test')).toBe(mapper);
  });

  it('warns and returns undefined when mapper not registered', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    expect(registry.get('missing')).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Mapper for missing not registered');
    spy.mockRestore();
  });
});
