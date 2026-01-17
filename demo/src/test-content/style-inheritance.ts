export const styleInheritanceHtml = `
<div>
  <h1>Style Inheritance Test</h1>
  <p>This test verifies that table borders are NOT inherited by paragraphs inside cells.</p>
  
  <table style="border: 2px solid blue; width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="border: 1px solid blue; padding: 10px;">Header 1</th>
        <th style="border: 1px solid blue; padding: 10px;">Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid blue; padding: 10px;">
          <p style="color: red;">This paragraph should be red, but should NOT have a blue border itself.</p>
        </td>
        <td style="border: 1px solid blue; padding: 10px;">
          <p>This is a normal paragraph.</p>
        </td>
      </tr>
    </tbody>
  </table>

  <h2>List Test</h2>
  <ul style="color: green;">
    <li>This list item should be green (inherits color).</li>
    <li style="color: black;">This list item overrides color to black.</li>
  </ul>
</div>
`;
