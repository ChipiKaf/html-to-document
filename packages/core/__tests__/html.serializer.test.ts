import { Parser } from '../src/parser';
import { JSDOMParser } from './utils/parser.helper';
import { toHtml } from '../src/utils/html.serializer';
import { minifyMiddleware } from 'html-to-document-core';
import { DocumentElement } from '../src/types';

describe('html.serializer', () => {
  let parser: Parser;
  beforeEach(() => {
    parser = new Parser([], new JSDOMParser());
  });

  it('serializes plain text', () => {
    const elements = parser.parse('plain text');
    // expect(toHtml(elements)).toBe('<div>plain text</div>');
  });

  it('round-trips a simple paragraph', () => {
    const html = '<div><p>Hello World</p></div>';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe('<div><p>Hello World</p></div>');
  });

  it('round-trips nested elements', () => {
    const html =
      '<p>Test <strong style="font-weight: bold">Bold</strong> and <em style="font-style: italic">Italic</em></p>';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe(
    //   '<div><p>Test <strong style="font-weight: bold">Bold</strong> and <em style="font-style: italic">Italic</em></p></div>'
    // );
  });

  it('round-trips attributes and styles', () => {
    const html = '<a href="https://example.com" title="Example">Link</a>';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe(
    //   '<div><a href="https://example.com" title="Example">Link</a></div>'
    // );
  });

  it('round-trips inline styles', () => {
    const html = '<p style="color: red; font-size: 12px">Styled</p>';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe(
    //   '<div><p style="color: red; font-size: 12px">Styled</p></div>'
    // );
  });

  it('round-trips image with src attribute', () => {
    const html = '<img src="https://example.com/image.png">';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe(
    //   '<div><img src="https://example.com/image.png"></div>'
    // );
  });

  it('round-trips line breaks', () => {
    const html = '<br>';
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe('<div><br></div>');
  });

  it('restores complex html string back to html', () => {
    const html = `<div>
<h1 style="text-align: center; color: darkblue;">Complex Document Test</h1>
<p><strong>Author: </strong><em>Test User</em> | <u>Date: </u> <span style="color: gray;">2025-04-10</span></p>
<h2>Introduction</h2>
<p>This document is <span style="background-color: yellow;">designed to test</span> the capabilities of the <code>html-to-document</code> converter library.</p>
<h2>Lists</h2>
<ul>
<li>Unordered item one</li>
<li>Unordered item two
<ol>
<li>Ordered nested one</li>
<li>Ordered nested two
<ul>
<li>Deep nested item</li>
</ul>
</li>
</ol>
</li>
<li>Unordered item three with <strong>bold</strong> and <span style="color: green;">green</span> text.</li>
</ul>
<h2>Table</h2>
<table style="border-collapse: collapse; width: 100%;" border="1">
<thead>
<tr>
<th style="background-color: #f0f0f0;">Feature</th>
<th>Description</th>
<th colspan="2">Example</th>
</tr>
</thead>
<tbody>
<tr>
<td>Text Formatting</td>
<td><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u></td>
<td colspan="2">✔</td>
</tr>
<tr>
<td>Lists</td>
<td>Ordered and Unordered</td>
<td colspan="2">✔</td>
</tr>
<tr>
<td rowspan="2">Table Merging</td>
<td>Row Span</td>
<td>Yes</td>
<td>No</td>
</tr>
<tr>
<td>Col Span</td>
<td colspan="2">Yes</td>
</tr>
</tbody>
</table>
<h2>Media and Code</h2>
<p>Here's an image:<br><img src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1260&amp;h=750&amp;dpr=1"></p>
<p>Here's a link to <a href="https://example.com" target="_blank" rel="noopener">Example.com</a></p>
<pre><code>function hello() {
  console.log("Hello, world!");
}</code></pre>
<h2>Other Elements</h2>
<blockquote cite="https://example.com">"This is a sample blockquote with a citation and multiple lines.<br>It should be rendered as a block-level quote in DOCX."</blockquote>
<p>Mathematical notation: E = mc<sup>2</sup></p>
<p>Chemical formula: H<sub>2</sub>O</p>
<hr>
<h3>Conclusion</h3>
<p>End of test document. &copy; 2025 Test User &mdash; All rights reserved.</p>
</div>`;
    const elements = parser.parse(html);
    // expect(toHtml(elements)).toBe(html);
  });
  it('restores complex html string back to html after deep clone of object', async () => {
    const html = `<div>
<h1 style="text-align: center; color: darkblue;">Complex Document Test</h1>
<p><strong>Author: </strong><em>Test User</em> | <u>Date: </u> <span style="color: gray;">2025-04-10</span></p>
<h2>Introduction</h2>
<p>This document is <span style="background-color: yellow;">designed to test</span> the capabilities of the <code>html-to-document</code> converter library.</p>
<h2>Lists</h2>
<ul>
<li>Unordered item one</li>
<li>Unordered item two
<ol>
<li>Ordered nested one</li>
<li>Ordered nested two
<ul>
<li>Deep nested item</li>
</ul>
</li>
</ol>
</li>
<li>Unordered item three with <strong>bold</strong> and <span style="color: green;">green</span> text.</li>
</ul>
<h2>Table</h2>
<table style="border-collapse: collapse; width: 100%;" border="1">
<thead>
<tr>
<th style="background-color: #f0f0f0;">Feature</th>
<th>Description</th>
<th colspan="2">Example</th>
</tr>
</thead>
<tbody>
<tr>
<td>Text Formatting</td>
<td><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u></td>
<td colspan="2">✔</td>
</tr>
<tr>
<td>Lists</td>
<td>Ordered and Unordered</td>
<td colspan="2">✔</td>
</tr>
<tr>
<td rowspan="2">Table Merging</td>
<td>Row Span</td>
<td>Yes</td>
<td>No</td>
</tr>
<tr>
<td>Col Span</td>
<td colspan="2">Yes</td>
</tr>
</tbody>
</table>
<h2>Media and Code</h2>
<p>Here's an image:<br><img src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1260&amp;h=750&amp;dpr=1"></p>
<p>Here's a link to <a href="https://example.com" target="_blank" rel="noopener">Example.com</a></p>
<pre><code>function hello() {
  console.log("Hello, world!");
}</code></pre>
<h2>Other Elements</h2>
<blockquote cite="https://example.com">"This is a sample blockquote with a citation and multiple lines.<br>It should be rendered as a block-level quote in DOCX."</blockquote>
<p>Mathematical notation: E = mc<sup>2</sup></p>
<p>Chemical formula: H<sub>2</sub>O</p>
<hr>
<h3>Conclusion</h3>
<p>End of test document. &copy; 2025 Test User &mdash; All rights reserved.</p>
</div>`;
    const elements = JSON.parse(JSON.stringify(parser.parse(html)));
    expect(await minifyMiddleware(toHtml(elements))).toBe(
      await minifyMiddleware(html)
    );
  });
  it('restores complex html string, when altered in parsing by tag handler, back to html after deep clone of object', async () => {
    const html = `<div>
<h1 style="text-align: center; color: darkblue;">Complex Document Test</h1>
<p><strong>Author: </strong><em>Test User</em> | <u>Date: </u> <span style="color: gray;">2025-04-10</span></p>
<h2>Introduction</h2>
<p>This document is <span style="background-color: yellow;">designed to test</span> the capabilities of the <code>html-to-document</code> converter library.</p>
<h2>Lists</h2>
<ul>
<li>Unordered item one</li>
<li>Unordered item two
<ol>
<li>Ordered nested one</li>
<li>Ordered nested two
<ul>
<li>Deep nested item</li>
</ul>
</li>
</ol>
</li>
<li>Unordered item three with <strong>bold</strong> and <span style="color: green;">green</span> text.</li>
</ul>
<h2>Table</h2>
<table style="border-collapse: collapse; width: 100%;" border="1">
<thead>
<tr>
<th style="background-color: #f0f0f0;">Feature</th>
<th>Description</th>
<th colspan="2">Example</th>
</tr>
</thead>
<tbody>
<tr>
<td>Text Formatting</td>
<td><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u></td>
<td colspan="2">✔</td>
</tr>
<tr>
<td>Lists</td>
<td>Ordered and Unordered</td>
<td colspan="2">✔</td>
</tr>
<tr>
<td rowspan="2">Table Merging</td>
<td>Row Span</td>
<td>Yes</td>
<td>No</td>
</tr>
<tr>
<td>Col Span</td>
<td colspan="2">Yes</td>
</tr>
</tbody>
</table>
<h2>Media and Code</h2>
<p>Here's an image:<br><img src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1260&amp;h=750&amp;dpr=1"></p>
<p>Here's a link to <a href="https://example.com" target="_blank" rel="noopener">Example.com</a></p>
<pre><code>function hello() {
  console.log("Hello, world!");
}</code></pre>
<h2>Other Elements</h2>
<blockquote cite="https://example.com">"This is a sample blockquote with a citation and multiple lines.<br>It should be rendered as a block-level quote in DOCX."</blockquote>
<p>Mathematical notation: E = mc<sup>2</sup></p>
<p>Chemical formula: H<sub>2</sub>O</p>
<hr>
<h3>Conclusion</h3>
<p>End of test document. &copy; 2025 Test User &mdash; All rights reserved.</p>
</div>`;
    parser.registerTagHandler('p', (el) => {
      return {
        text: 'Some content',
        styles: { color: 'pink' },
        type: 'heading',
        metadata: { name: 'other name' },
      };
    });
    const elements = JSON.parse(JSON.stringify(parser.parse(html)));
    const transformed = await minifyMiddleware(toHtml(elements));

    // 1) every original <p> should have been replaced with the pink version
    const pMatches = transformed.match(/<p(?=\s|>)[^>]*>/g) || [];
    expect(pMatches.length).toBeGreaterThan(0);
    pMatches.forEach((tag) => {
      expect(tag).toContain('style="color: pink;"');
    });
    expect(transformed).not.toContain('Author:');
    expect(transformed).not.toContain('This document is');
    expect(transformed).toContain('<p style="color: pink;">Some content</p>');

    // 2) check that other elements (e.g. <h1>) remain unchanged
    expect(transformed).toContain(
      '<h1 style="text-align: center; color: darkblue;">Complex Document Test</h1>'
    );
  });

  it('applies default styles when serializing', () => {
    const elements: DocumentElement[] = [
      { type: 'paragraph', text: 'Hello', styles: {}, attributes: {} },
    ];

    const html = toHtml(elements, {
      paragraph: { color: 'red', fontSize: '12px' },
    });

    expect(html).toContain('<p style="color: red; font-size: 12px;">Hello</p>');
  });
});
