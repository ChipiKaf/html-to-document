import { minifyMiddleware } from '../../src/middleware/minify.middleware';

describe('minifyMiddleware', () => {
  it('removes HTML comments', async () => {
    const input = '<div><!-- comment -->Hello</div>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<div>Hello</div>');
  });

  it('maintains carriage returns for children of pre tag', async () => {
    const input = '<pre>Hello\r\nWorld</pre>';
    const output = await minifyMiddleware(input);
    expect(output).toBe('<pre>Hello\r\nWorld</pre>');
  });

  it('maintains whitespace for children of pre tag', async () => {
    const input = `<pre>Hello
    
    World</pre>`;
    const output = await minifyMiddleware(input);
    expect(output).toBe(`<pre>Hello
    
    World</pre>`);
  });

  it('maintains spaces between tags', async () => {
    const input =
      '<div><span>Hello </span><span>World</span><span> We</span><span> Here</span></div>';
    const output = await minifyMiddleware(input);
    expect(output).toBe(
      '<div><span>Hello </span><span>World</span><span> We</span><span> Here</span></div>'
    );
  });
  it('Properly formats the html', async () => {
    const html = `<ol>
                    <li>awej</li>
                    <li>awew</li>
                    <li>rw</li>
                    </ol>
                    <ul>
                    <li>Hello
                    <ul>
                    <li>There</li>
                    </ul>
                    </li>
                    <li>My <span style="color: #b96ad9;">world is</span> here 
                    <ul>
                    <li>Also <strong>ther</strong>
                    <ul>
                    <li><strong>What else? </strong>Is <strong>There?</strong></li>
                    </ul>
                    </li>
                    </ul>
                    </li>
                    </ul>`;
    const output = await minifyMiddleware(html);
    expect(output).toBe(
      `<ol><li>awej</li><li>awew</li><li>rw</li></ol><ul><li>Hello <ul><li>There</li></ul></li><li>My <span style="color: #b96ad9;">world is</span> here <ul><li>Also <strong>ther</strong><ul><li><strong>What else? </strong>Is <strong>There?</strong></li></ul></li></ul></li></ul>`
    );
  });

  it('adds max one space between tags', async () => {
    let html = `<p style="font-weight:bold" data-custom="x">
      <span style="color: red;">Hello
        <span style="color: green;">Green World</span>
      </span>World</p>`;
    const output = await minifyMiddleware(html);
    expect(output).toBe(
      '<p style="font-weight:bold" data-custom="x"><span style="color: red;">Hello <span style="color: green;">Green World</span></span>World</p>'
    );
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
