export const startContent1 = `
<div>
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
  <table border="1" style="border-collapse: collapse; width: 100%;">
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
  <p>
    Here's an image:<br />
    <img src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" />
  </p>
  <p>
    Here's a link to <a href="https://example.com" target="_blank">Example.com</a>
  </p>
  <pre><code>function hello() {
  console.log("Hello, world!");
}</code></pre>

  <h2>Other Elements</h2>
  <blockquote cite="https://example.com">
    "This is a sample blockquote with a citation and multiple lines.<br />
    It should be rendered as a block-level quote in DOCX."
  </blockquote>

  <p>Mathematical notation: E = mc<sup>2</sup></p>
  <p>Chemical formula: H<sub>2</sub>O</p>

  <hr />

  <h3>Conclusion</h3>
  <p>End of test document. © 2025 Test User &mdash; All rights reserved.</p>
</div>
`;

export const startContent2 = `
<div>
<h1 style="text-align: right; color: crimson; margin-bottom: 0;">Advanced Test Document</h1>
<p style="font-size: 18px; line-height: 1.6; text-indent: 30px;">This paragraph tests <span style="letter-spacing: 2px;">letter-spacing</span>, <span style="word-spacing: 8px;">word-spacing</span>, and <small>small text</small> effects.</p>
<p style="text-align: justify; margin: 20px;">Here is a <span style="text-decoration: line-through underline;"> combined decoration </span> example with both strike‑through and underline.</p>
<h2>Complex Table</h2>
<table style="border-collapse: separate; border-spacing: 8px; width: 100%; margin-bottom: 20px;" border="2"><caption style="caption-side: bottom; font-style: italic;">Sales Report Q1</caption><colgroup> <col style="width: 30%; background-color: #e0f7fa;"> <col style="width: 35%;"> <col style="width: 35%;"> </colgroup>
<thead>
<tr>
<th style="background-color: #b2ebf2;">Product</th>
<th style="background-color: #b2ebf2;">Region</th>
<th style="background-color: #b2ebf2;">Revenue</th>
</tr>
</thead>
<tbody>
<tr>
<td rowspan="2">Widget A</td>
<td style="vertical-align: middle; height: 50px;">North</td>
<td style="text-align: right;">$10,000</td>
</tr>
<tr>
<td style="vertical-align: bottom; height: 50px;">South</td>
<td style="text-align: right;">$8,500</td>
</tr>
<tr>
<td>Widget B</td>
<td colspan="2"><!-- nested table -->
<table style="width: 100%;" border="1"><caption style="caption-side: bottom; font-style: italic;">Details caption</caption>
<tbody>
<tr>
<td>Detail 1</td>
<td>Detail 2</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
<tfoot>
<tr>
<td colspan="2">Total</td>
<td style="text-align: right; font-weight: bold;">$18,500</td>
</tr>
</tfoot>
</table>
<h2>Float &amp; Wrapping</h2>
<img style="float: left; margin: 15px; border: 2px dashed #333;" src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1260&amp;h=750&amp;dpr=1" alt="Floating image">
<p>This text should wrap around the floating image to test inline float handling in the converter. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
<div style="clear: both;">&nbsp;</div>
<h2>Definition List</h2>
<dl>
<dt>HTML-to-Document</dt>
<dd>A library to convert HTML to DOCX/PDF/XLSX.</dd>
<dt>Test Case</dt>
<dd>A scenario used to validate functionality.</dd>
</dl>
<h2>Media Figure</h2>
<figure style="text-align: center; margin: 20px;"><img style="width: 150px; height: 150px; border: 1px solid #ccc;" src="https://images.pexels.com/photos/31579434/pexels-photo-31579434/free-photo-of-scenic-rocky-beach-in-antalya-turkiye.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1260&amp;h=750&amp;dpr=1" alt="Sample">
<figcaption>Figure&nbsp;1: Sample placeholder image</figcaption>
</figure>
<h2>Code Block with Title</h2>
<pre><code class="language-js">
// Sample calculation:
const square = (x) =&gt; x * x;
console.log(square(5)); // 25
  </code></pre>
</div>
`;
