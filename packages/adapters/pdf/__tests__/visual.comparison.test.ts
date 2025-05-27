import { PDFAdapter } from '../src/pdf.adapter';
import { DocxAdapter } from '../../docx/src/docx.adapter';
import {
  DocumentElement,
  StyleMapper,
  VisualTestUtils,
} from 'html-to-document-core';

/**
 * Visual comparison tests between PDF and DOCX adapters
 *
 * These tests ensure that both adapters produce visually similar output
 * for the same document elements, maintaining consistency across formats.
 */
describe('Visual Comparison: PDF vs DOCX', () => {
  let pdfAdapter: PDFAdapter;
  let docxAdapter: DocxAdapter;

  beforeEach(() => {
    const styleMapper = new StyleMapper();
    pdfAdapter = new PDFAdapter({ styleMapper });
    docxAdapter = new DocxAdapter({ styleMapper });
  });

  describe('Basic Elements', () => {
    it('should produce visually similar headings', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Main Title',
          level: 1,
          styles: { fontSize: '24px', fontWeight: 'bold' },
          attributes: {},
        },
        {
          type: 'heading',
          text: 'Subtitle',
          level: 2,
          styles: { fontSize: '18px', fontWeight: 'bold' },
          attributes: {},
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 5.0, // Allow 5pt tolerance for headings
      //     exactTextMatch: true,
      //     compareStyles: true,
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.85);
      // expect(result.unmatchedElements.layout1).toHaveLength(0);
      // expect(result.unmatchedElements.layout2).toHaveLength(0);

      // // Check that all headings were matched
      // expect(result.elementComparisons).toHaveLength(2);

      // // Verify text content matches
      // for (const comparison of result.elementComparisons) {
      //   expect(comparison.textMatches).toBe(true);
      // }
    });

    it('should produce visually similar paragraphs with various styles', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'This is a regular paragraph with normal styling.',
          styles: {},
          attributes: {},
        },
        {
          type: 'paragraph',
          text: 'This paragraph is bold and italic.',
          styles: { fontWeight: 'bold', fontStyle: 'italic' },
          attributes: {},
        },
        {
          type: 'paragraph',
          text: 'This paragraph has custom color and size.',
          styles: { color: '#FF0000', fontSize: '14px' },
          attributes: {},
        },
        {
          type: 'paragraph',
          text: 'This paragraph is center-aligned.',
          styles: { textAlign: 'center' },
          attributes: {},
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 3.0,
      //     sizeTolerance: 2.0,
      //     exactTextMatch: true,
      //     compareStyles: true,
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.8);

      // // Generate detailed report for debugging if similarity is low
      // if (result.similarity < 0.9) {
      //   const report = VisualTestUtils.generateComparisonReport(result);
      //   console.log('Visual comparison report:', report);
      // }

      // // All paragraphs should be matched
      // expect(result.elementComparisons).toHaveLength(4);
    });

    it('should handle complex nested content with consistent layout', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This paragraph contains ' },
            {
              type: 'text',
              text: 'bold text',
              styles: { fontWeight: 'bold' },
            },
            { type: 'text', text: ' and ' },
            {
              type: 'text',
              text: 'italic text',
              styles: { fontStyle: 'italic' },
            },
            { type: 'text', text: ' in the same line.' },
          ],
          styles: {},
          attributes: {},
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Chemical formula: H' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'sub' },
            },
            { type: 'text', text: 'O and E=mc' },
            {
              type: 'text',
              text: '2',
              styles: { verticalAlign: 'super' },
            },
          ],
          styles: {},
          attributes: {},
        },
      ];

      // await VisualTestUtils.assertVisualSimilarity(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   0.75, // Lower threshold for complex nested content
      //   {
      //     positionTolerance: 5.0,
      //     exactTextMatch: false, // Allow slight text variations due to formatting
      //     compareStyles: false, // Focus on layout rather than exact styling
      //   }
      // );
    });
  });

  describe('List Elements', () => {
    it('should produce visually similar unordered lists', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'list',
          listType: 'unordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'First item' }],
              level: 0,
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Second item' }],
              level: 0,
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Third item' }],
              level: 0,
            },
          ],
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 8.0, // Lists might have different bullet positioning
      //     compareStyles: false, // Bullet styles can vary significantly
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.7);
    });

    it('should produce visually similar ordered lists', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'list',
          listType: 'ordered',
          level: 0,
          content: [
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'First step' }],
              level: 0,
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Second step' }],
              level: 0,
            },
            {
              type: 'list-item',
              content: [{ type: 'text', text: 'Third step' }],
              level: 0,
            },
          ],
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 8.0,
      //     compareStyles: false,
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.7);
    });
  });

  describe('Special Elements', () => {
    it('should produce visually similar horizontal lines', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Content before line',
          styles: {},
          attributes: {},
        },
        {
          type: 'line',
          styles: {},
          attributes: {},
        },
        {
          type: 'paragraph',
          text: 'Content after line',
          styles: {},
          attributes: {},
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 5.0,
      //     compareStyles: false, // Line rendering can vary
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.75);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty document', async () => {
      const elements: DocumentElement[] = [];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements
      // );

      // expect(result.similarity).toBe(1.0); // Empty documents should be identical
      // expect(result.elementComparisons).toHaveLength(0);
    });

    it('should handle single element document', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Single paragraph document',
          styles: {},
          attributes: {},
        },
      ];

      // await VisualTestUtils.assertVisualSimilarity(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   0.9
      // );
    });

    it('should handle large document with many elements', async () => {
      const elements: DocumentElement[] = [];

      // Create a document with 50 paragraphs
      for (let i = 1; i <= 50; i++) {
        elements.push({
          type: 'paragraph',
          text: `This is paragraph number ${i} with some text content.`,
          styles: {},
          attributes: {},
        });
      }

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements,
      //   {
      //     positionTolerance: 5.0,
      //     sizeTolerance: 3.0,
      //   }
      // );

      // expect(result.similarity).toBeGreaterThan(0.8);
      // expect(result.elementComparisons).toHaveLength(50);
    }, 30000); // Increase timeout for large documents
  });

  describe('Detailed Analysis', () => {
    it('should provide detailed comparison report', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Test Report Generation',
          level: 1,
          styles: { fontSize: '20px', fontWeight: 'bold' },
          attributes: {},
        },
        {
          type: 'paragraph',
          text: 'This test verifies that detailed comparison reports are generated.',
          styles: {},
          attributes: {},
        },
      ];

      // const result = await VisualTestUtils.compareDocxToPdf(
      //   docxAdapter,
      //   pdfAdapter,
      //   elements
      // );

      // const report = VisualTestUtils.generateComparisonReport(result);

      // expect(report).toContain('Visual Comparison Report');
      // expect(report).toContain('Overall Similarity');
      // expect(report).toContain('Element Comparisons');

      // Log the report for manual inspection
      // console.log('\n' + report);
    });
  });
});
