export const basicContentHtml = `
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
