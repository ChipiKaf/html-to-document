---
'html-to-document-adapter-docx': minor
---

Header rows that start a table, rows in a `<thead>` or rows of only `<th>` cells, are marked as header rows (`<w:tblHeader/>`), so Word repeats them at the top of every page the table continues on. Word only repeats header rows that start the table, so the first row that isn't one ends them.
