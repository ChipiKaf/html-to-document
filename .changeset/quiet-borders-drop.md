---
'html-to-document-adapter-docx': patch
---

Don't write border sides that have a colour, width or padding but no style. Such a side has no `w:val`, which ECMA-376 requires and Word may report as a damaged file, and as in CSS, where `border-style` defaults to `none`, it draws no border.
