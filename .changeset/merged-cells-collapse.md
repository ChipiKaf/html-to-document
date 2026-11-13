---
'html-to-document-adapter-docx': minor
---

Tables follow the HTML table model and the CSS collapsed border model more closely:

- A cell spanning both rows and columns no longer drops the cell after it in the spanned rows, and a row made wider than every other row by a `rowspan` keeps all its cells.
- A `rowspan` reaching past the last row is cut off there instead of writing a merge with nothing to merge.
- `border-style: hidden` suppresses the shared border along every part of an edge, also for cells spanning rows or columns, and a table's hidden border suppresses the cells' borders along the table's edge. `border-style: none` on a neighbour still leaves the cell's border.
- A cell's styles resolve in one order everywhere: default styles, then style sheet rules, then inline styles. Before, default styles overrode style sheet rules for the cell's own properties, such as its background and borders.
- A table without rows keeps its captions. Only the table is left out, since Word can't open a table without rows.
