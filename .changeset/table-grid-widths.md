---
'html-to-document-adapter-docx': minor
---

Tables get their column widths from `<colgroup>` in both the cells and the grid:

- A cell spanning columns gets the widths of every column it spans added together, instead of the first column's width. When they are all percentages, the width stays a percentage of the table, so the table still resizes with the page in Word. A percentage and an absolute width add up in twips. A cell's own `width` still wins.
- As in CSS's fixed table layout, columns without a `<col>` with a width split the rest of the table's width evenly, as a percentage when the other columns are percentages. They are left without a width when no column has one, or the others leave none for them.
- The table's grid (`<w:tblGrid>`) gets the widths of its columns in twips instead of placeholders, so LibreOffice and Google Docs, which lay tables out by the grid, show the columns as wide as they are.
- A percentage resolves against the table's width, and a percentage table, or a table without a width, against the width of its container's content: the page's width between its left and right margins, from the `@page` rules and the default section options, or for a table nested in a cell, the width of the cell's content, as in CSS: a column's width, and a cell's percentage width, include the cell's padding, while a cell's absolute width doesn't, unless the cell has `box-sizing: border-box`. Converters get that width, in twips, as `containerContentWidth` in their dependencies, and `converter.withContainerContentWidth(width)` converts the content of a container of that width.
