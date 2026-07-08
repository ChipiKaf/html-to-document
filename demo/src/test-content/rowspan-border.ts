export const rowspanBorderHtml = `
<div>
  <h1>Rowspan Border Regression</h1>
  <p>
    This table reproduces the DOCX border issue where the lower part of the
    right border on the vertically merged middle cell could disappear.
  </p>
  <table style="border-collapse: collapse; width: 100%;">
    <tr>
      <td style="border: 1px solid #000000;">A1</td>
      <td style="border: 1px solid #000000;" rowspan="2">A2 rowspan=2</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000000;">B1</td>
    </tr>
  </table>
</div>
`;
