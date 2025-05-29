import { VisualTestUtils } from '../src/testing/visual.test.utils';
import { DocumentElement } from '../src/types';
import { StyleMapper } from '../src/style.mapper';
import { DocxAdapter } from '@gdocs2md/html-to-document-adapter-docx';
import { PdfAdapter } from '@gdocs2md/html-to-document-adapter-pdf';

describe('Visual Layout Comparison between DOCX and PDF', () => {
  let styleMapper: StyleMapper;
  let docxAdapter: DocxAdapter;
  let pdfAdapter: PdfAdapter;

  beforeAll(() => {
    styleMapper = new StyleMapper();
    docxAdapter = new DocxAdapter(styleMapper);
    pdfAdapter = new PdfAdapter(styleMapper);
  });

  it('should compare a simple paragraph', async () => {
    const elements: DocumentElement[] = [{
      type: 'paragraph',
      children: [{ type: 'text', text: 'Hello world this is a test paragraph.' }],
      styles: { fontSize: '12px', color: 'black' },
      attributes: {},
    }];
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.90);
  });

  it('should compare different heading levels', async () => {
    const elements: DocumentElement[] = [
      {
        type: 'heading',
        level: 1,
        children: [{ type: 'text', text: 'Heading Level 1' }],
        styles: { fontSize: '24px', color: 'black', fontWeight: 'bold' },
        attributes: {},
      },
      {
        type: 'heading',
        level: 2,
        children: [{ type: 'text', text: 'Heading Level 2' }],
        styles: { fontSize: '18px', color: 'black', fontWeight: 'bold' },
        attributes: {},
      },
    ];
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.88); // Headings can have slightly more variance
  });

  it('should compare a paragraph with styled text (bold and italic)', async () => {
    const elements: DocumentElement[] = [{
      type: 'paragraph',
      children: [
        { type: 'text', text: 'This is ' },
        { type: 'text', text: 'bold', styles: { fontWeight: 'bold' } },
        { type: 'text', text: ' and this is ' },
        { type: 'text', text: 'italic', styles: { fontStyle: 'italic' } },
        { type: 'text', text: '.' },
      ],
      styles: { fontSize: '12px', color: 'black' },
      attributes: {},
    }];
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.85); // Styled text can also vary
  });

  it('should compare a center-aligned paragraph', async () => {
    const elements: DocumentElement[] = [{
      type: 'paragraph',
      children: [{ type: 'text', text: 'This paragraph is center-aligned.' }],
      styles: { fontSize: '12px', color: 'black', textAlign: 'center' },
      attributes: {},
    }];
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.90);
  });

  it('should compare a simple unordered list', async () => {
    const elements: DocumentElement[] = [{
      type: 'list',
      format: 'unordered',
      children: [
        { type: 'listItem', children: [{ type: 'text', text: 'List item 1' }], styles: { fontSize: '12px' } },
        { type: 'listItem', children: [{ type: 'text', text: 'List item 2' }], styles: { fontSize: '12px' } },
        { type: 'listItem', children: [{ type: 'text', text: 'List item 3' }], styles: { fontSize: '12px' } },
      ],
      styles: {},
      attributes: {},
    }];
    // Lists can have significant rendering differences in bullet points and spacing
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.80);
  });

  it('should compare a very simple table', async () => {
    const elements: DocumentElement[] = [{
      type: 'table',
      children: [ // Table rows
        {
          type: 'tableRow',
          children: [ // Table cells
            {
              type: 'tableCell',
              children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Cell 1' }], styles: { fontSize: '12px' } }],
              styles: {},
            },
            {
              type: 'tableCell',
              children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Cell 2' }], styles: { fontSize: '12px' } }],
              styles: {},
            },
          ],
          styles: {},
        },
      ],
      styles: {},
      attributes: {},
    }];
    // Tables are notoriously difficult to compare visually due to border rendering, cell padding, and width calculations
    await VisualTestUtils.assertVisualSimilarity(docxAdapter, pdfAdapter, elements, 0.75);
  });
});
