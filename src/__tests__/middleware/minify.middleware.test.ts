import { minifyMiddleware } from '../../middleware/minify.middleware';

describe('minifyMiddleware', () => {
  it('removes HTML comments', async () => {
    const input = '<div><!-- comment -->Hello</div>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<div>Hello</div>');
  });

  it('removes newlines and carriage returns', async () => {
    const input = '<div>\nHello\r\nWorld</div>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<div>Hello World</div>');
  });

  it('removes whitespace between tags', async () => {
    const input = '<div> </div>   <span>text</span>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<div></div><span>text</span>');
  });

  it('collapses multiple spaces', async () => {
    const input = '<p>   Lots     of    space   </p>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<p>Lots of space</p>');
  });

  it('trims the final string', async () => {
    const input = '   <div>content</div>   ';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<div>content</div>');
  });
});
