---
id: docx-pages
sidebar_position: 8
title: DOCX Page Sections
---

# DOCX Page Sections & Headers

The DOCX adapter understands special HTML markup for controlling page breaks and per-page headers or footers.

## `<section class="page">`

Wrapping content in a `<section>` with the `page` class starts a new page. Any `<header>` or `<footer>` elements inside that section become the header or footer for that page only.

```html
<header>Global Header</header>
<section class="page">
  <header>Page 1 Header</header>
  <p>First page</p>
  <footer>Page 1 Footer</footer>
</section>
<section class="page">
  <p>Second page body</p>
</section>
<footer>Global Footer</footer>
```

The example above generates a DOCX file with two pages:

- The first page uses "Page 1 Header" and "Page 1 Footer".
- The second page falls back to the global header and footer.

## `<section class="page-break">`

Insert an empty section with the `page-break` class to force a new page between other elements:

```html
<p>A</p>
<section class="page-break"></section>
<p>B</p>
```

This will output two separate sections in the resulting DOCX.

Global `<header>` or `<footer>` elements placed outside any `.page` sections apply to all pages that do not specify their own header or footer.
