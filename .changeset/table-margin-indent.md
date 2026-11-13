---
'html-to-document-adapter-docx': minor
---

A table's `margin-left` indents it (`<w:tblInd>`), as asked for in #71. A percentage resolves against the width of the table's container's content, as in CSS: the page's width between its left and right margins, or a cell's content for a table nested in a cell.

`DocxStyleMapper.mapStyles` takes an optional `StyleMappingContext` as its third argument, which it passes on to the style mappings. Its `containerContentWidth` is what percentages resolve against, such as a table's `margin-left`.
