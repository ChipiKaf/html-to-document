import { Converter } from '../src/converter';
import { IDocumentConverter } from '../src/converters/IDocumentConverter';

class DummyConverter implements IDocumentConverter {
  public parsed?: any;
  async convert(parsed: any): Promise<Buffer> {
    this.parsed = parsed;
    return Buffer.from('dummy-result');
  }
}

describe('Converter', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  it('throws when no converter registered', async () => {
    await expect(converter.convert('<p>test</p>', 'unknown')).rejects.toThrow(
      'Format not available'
    );
  });

  it('registers and uses a converter to return a Buffer', async () => {
    const adapter = new DummyConverter();
    converter.registerConverter('dummy', adapter);

    const result = await converter.convert('<p>Hello</p>', 'dummy');
    expect(result.toString()).toBe('dummy-result');
    expect(adapter.parsed).toBeDefined();
    expect(adapter.parsed[0].type).toBe('paragraph');
    expect(adapter.parsed[0].text).toBe('Hello');
  });

  it('applies middleware before parsing', async () => {
    const adapter = new DummyConverter();
    converter.registerConverter('dummy', adapter);
    converter.useMiddleware(async (html) => html.replace('Hello', 'Hi'));

    await converter.convert('<p>Hello</p>', 'dummy');
    expect(adapter.parsed[0].text).toBe('Hi');
  });
});
