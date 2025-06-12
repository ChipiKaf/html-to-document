import {
  DocumentElement,
  IDocumentDeconverter,
  Parser,
  IDOMParser,
} from 'html-to-document-core';
// Dynamically create a DOM parser based on the execution environment so the
// deconverter can run in both Node and the browser.
function createDomParser(): IDOMParser {
  if (typeof window === 'undefined') {
    // Node environment - use jsdom.
    const { JSDOM } = require('jsdom') as typeof import('jsdom');
    return {
      parse(html: string): Document {
        const dom = new JSDOM(html);
        return dom.window.document;
      },
    };
  }

  // Browser environment - rely on DOMParser.
  return {
    parse(html: string): Document {
      return new DOMParser().parseFromString(html, 'text/html');
    },
  };
}

// Runtime‑agnostic flag
const isNode = typeof window === 'undefined';

function sanitizeTables(html: string): string {
  const { parse } = createDomParser();
  const doc = parse(html);
  const tables = Array.from(doc.querySelectorAll('table'));

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const cellCounts = rows.map((r) => r.querySelectorAll('td,th').length);
    const maxCells = Math.max(...cellCounts, 0);
    const minCells = Math.min(...cellCounts, Infinity);

    if (rows.length < 2 || maxCells <= 1 || maxCells - minCells > 1) {
      const text = table.textContent || '';
      const p = doc.createElement('p');
      p.textContent = text.trim();
      table.replaceWith(p);
    }
  }

  return doc.body.innerHTML;
}

export class PDFDeconverter implements IDocumentDeconverter {
  private _parser: Parser;

  constructor() {
    this._parser = new Parser([], createDomParser());
  }

  async deconvert(file: Buffer | Blob): Promise<DocumentElement[]> {
    let html = '';

    if (isNode) {
      // ─── Node: use pdf-parse (expects a Buffer) ────────────────────────────────
      const buffer: Buffer = Buffer.isBuffer(file)
        ? (file as Buffer)
        : file instanceof Blob
          ? Buffer.from(await file.arrayBuffer())
          : (() => {
              throw new Error('Unsupported input type in Node environment');
            })();

      const pdfParse = require('pdf-parse') as (
        data: Buffer
      ) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      const text = data.text;

      html = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join('');
    } else {
      // ─── Browser: use pdfjs-dist; expect a Blob/File from <input type="file"> ──
      if (!(file instanceof Blob)) {
        throw new Error(
          'Browser environment expects a Blob (e.g. File object)'
        );
      }

      // Modern pdfjs imports for browser
      const { getDocument, GlobalWorkerOptions } = await import(
        'pdfjs-dist/build/pdf.mjs'
      );
      const workerSrcModule = (
        await import('pdfjs-dist/build/pdf.worker.mjs?url')
      ).default;

      GlobalWorkerOptions.workerSrc = workerSrcModule;

      const uint8 = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocument(uint8).promise;

      let htmlPages: string[] = [];

      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const pageHtml = await this.pageToHTML(page);
        htmlPages.push(`<section class="page">${pageHtml}</section>`);
      }

      html = htmlPages.join('');
    }

    console.log(html);

    return this._parser.parse(html);
  }

  private async pageToHTML(page: any): Promise<string> {
    const [struct, content] = await Promise.all([
      page.getStructTree?.(),
      page.getTextContent({ includeMarkedContent: true }),
    ]);

    const escapeHTML = (str: string) =>
      str.replace(
        /[&<>"']/g,
        (m) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[m] || m
      );

    if (struct) {
      const itemById = Object.fromEntries(
        content.items.map((it: any, idx: number) => [`${idx}`, it])
      );

      const walk = (node: any): string => {
        if (node.type === 'content') {
          return escapeHTML(itemById[node.id].str);
        }
        const children = node.children.map(walk).join('');
        switch (node.role) {
          case 'H1':
            return `<h1>${children}</h1>`;
          case 'H2':
            return `<h2>${children}</h2>`;
          case 'L':
            return `<ul>${children}</ul>`;
          case 'LI':
            return `<li>${children}</li>`;
          case 'Table':
            return `<table>${children}</table>`;
          case 'TR':
            return `<tr>${children}</tr>`;
          case 'TH':
            return `<th>${children}</th>`;
          case 'TD':
            return `<td>${children}</td>`;
          case 'Span':
            return children;
          default:
            return `<p>${children}</p>`;
        }
      };

      return sanitizeTables(walk(struct));
    }

    // ─── Fallback: untagged PDF – heuristic reconstruction ────────────────
    const lines: { y: number; text: string }[] = [];

    for (const item of content.items as any[]) {
      const y = item.transform[5]; // baseline‑Y in device space
      const line = lines.find((l) => Math.abs(l.y - y) < 2);
      const txt = item.str.trim();
      if (line) {
        line.text += (txt ? ' ' : '') + txt;
      } else {
        lines.push({ y, text: txt });
      }
    }

    // Sort visual order: top → bottom
    lines.sort((a, b) => b.y - a.y);

    // Regex helpers for bullets / numbers
    const bulletRE =
      /^[\u2022\u2023\u2043\u25E6\u2024\u2027\uF0B7•·‣‧∙◦●▪*]\s*/;
    const numberedRE = /^\d+\s*(?:[.)]|‐|-|–|—)\s+/;

    const htmlParts: string[] = [];
    let inUL = false;
    let inOL = false;

    const openUL = () => {
      htmlParts.push('<ul>');
      inUL = true;
    };
    const closeUL = () => {
      if (inUL) {
        htmlParts.push('</ul>');
        inUL = false;
      }
    };
    const openOL = () => {
      htmlParts.push('<ol>');
      inOL = true;
    };
    const closeOL = () => {
      if (inOL) {
        htmlParts.push('</ol>');
        inOL = false;
      }
    };

    for (const { text } of lines) {
      const trimmed = text.trim();
      if (!trimmed) continue;

      if (bulletRE.test(trimmed)) {
        if (!inUL) {
          closeOL();
          openUL();
        }
        htmlParts.push(
          `<li>${escapeHTML(trimmed.replace(bulletRE, '').trim())}</li>`
        );
        continue;
      }

      if (numberedRE.test(trimmed)) {
        if (!inOL) {
          closeUL();
          openOL();
        }
        htmlParts.push(
          `<li>${escapeHTML(trimmed.replace(numberedRE, '').trim())}</li>`
        );
        continue;
      }

      // Any other line: end list context if open and emit paragraph
      closeUL();
      closeOL();
      htmlParts.push(`<p>${escapeHTML(trimmed)}</p>`);
    }

    closeUL();
    closeOL();

    return htmlParts.join('');
  }
}
