# Visual Layout Testing

This module provides utilities for visual comparison testing between different document adapters (DOCX, PDF, etc.). It allows you to ensure that adapters produce visually similar output for the same document elements.

## Overview

The visual testing system works by:

1. **Extracting spatial layouts** from generated documents using specialized renderers
2. **Comparing positioned elements** across different formats using similarity algorithms  
3. **Generating detailed reports** about differences in positioning, styling, and content

## Core Components

### Types

- `PositionedElement` - Represents an element with spatial position, size, and styling information
- `DocumentLayout` - Contains all positioned elements and page metadata
- `LayoutComparisonResult` - Detailed comparison results with similarity scores and differences
- `ComparisonConfig` - Configuration options for comparison tolerance and behavior

### Renderers

- `DocxRenderer` - Extracts layout from DOCX documents using XML parsing
- `PdfRenderer` - Extracts layout from PDF documents using pdf-parse and pdf-lib
- `RendererRegistry` - Manages and selects appropriate renderers for document formats

### Utilities

- `LayoutComparator` - Core comparison engine with configurable similarity algorithms
- `VisualTestUtils` - High-level testing utilities and Jest integration

## Quick Start

### Basic Usage

```typescript
import { 
  VisualTestUtils, 
  DocumentElement, 
  StyleMapper 
} from 'html-to-document-core';
import { DocxAdapter } from 'html-to-document-docx';
import { PDFAdapter } from 'html-to-document-pdf';

describe('Visual Comparison Tests', () => {
  let docxAdapter: DocxAdapter;
  let pdfAdapter: PDFAdapter;

  beforeEach(() => {
    const styleMapper = new StyleMapper();
    docxAdapter = new DocxAdapter({ styleMapper });
    pdfAdapter = new PDFAdapter({ styleMapper });
  });

  it('should produce visually similar headings', async () => {
    const elements: DocumentElement[] = [
      {
        type: 'heading',
        text: 'Main Title',
        level: 1,
        styles: { fontSize: '24px', fontWeight: 'bold' },
        attributes: {},
      }
    ];

    // Compare outputs with default settings
    const result = await VisualTestUtils.compareDocxToPdf(
      docxAdapter,
      pdfAdapter,
      elements
    );

    expect(result.similarity).toBeGreaterThan(0.90);
  });

  it('should handle complex layouts', async () => {
    const elements: DocumentElement[] = [
      // ... your document elements
    ];

    // Assert similarity with custom threshold
    await VisualTestUtils.assertVisualSimilarity(
      docxAdapter,
      pdfAdapter,
      elements,
      0.85, // 85% similarity threshold
      {
        positionTolerance: 5.0,
        sizeTolerance: 3.0,
        exactTextMatch: true,
        compareStyles: true,
      }
    );
  });
});
```

### Advanced Configuration

```typescript
import { LayoutComparator } from 'html-to-document-core';

const comparator = new LayoutComparator({
  positionTolerance: 3.0,     // Allow 3pt position differences
  sizeTolerance: 2.0,         // Allow 2pt size differences  
  exactTextMatch: false,      // Allow text normalization
  compareStyles: true,        // Compare styling properties
  matchingThreshold: 0.8,     // 80% similarity required for element matching
  respectPageBoundaries: true // Elements on different pages can't match
});

const result = comparator.compare(layout1, layout2);
```

### Generating Reports

```typescript
const result = await VisualTestUtils.compareDocxToPdf(
  docxAdapter, 
  pdfAdapter, 
  elements
);

const report = VisualTestUtils.generateComparisonReport(result);
console.log(report);

// Output:
// === Visual Comparison Report ===
// Overall Similarity: 87.50%
// 
// Element Comparisons:
//   element_0 ↔ pdf_element_0:
//     Similarity: 92.30%
//     Position Δ: (1.50, -0.80)
//     Size Δ: (0.00, 2.40)
//   ...
```

## Configuration Options

### Comparison Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `positionTolerance` | number | 2.0 | Tolerance for position differences (points) |
| `sizeTolerance` | number | 1.0 | Tolerance for size differences (points) |
| `exactTextMatch` | boolean | true | Whether to compare text content exactly |
| `compareStyles` | boolean | true | Whether to compare styling properties |
| `matchingThreshold` | number | 0.8 | Minimum similarity for element matching |
| `respectPageBoundaries` | boolean | true | Whether elements on different pages can match |

### Tolerance Guidelines

- **Position Tolerance**: 
  - `1-2pt` - Very strict, for pixel-perfect layouts
  - `3-5pt` - Standard, accounts for minor rendering differences
  - `5-10pt` - Lenient, for different layout engines

- **Size Tolerance**:
  - `0.5-1pt` - Strict, for consistent text rendering
  - `1-3pt` - Standard, accounts for font differences
  - `3-5pt` - Lenient, for different measurement systems

## Element Matching Algorithm

The comparison system uses a multi-factor similarity algorithm:

1. **Type Matching** (Required) - Elements must be the same type
2. **Page Matching** (Optional) - Elements must be on the same page
3. **Position Similarity** - Distance-based scoring with tolerance
4. **Size Similarity** - Dimension-based scoring with tolerance  
5. **Text Similarity** - Exact or normalized text comparison
6. **Style Similarity** - Property-by-property style comparison

Elements are matched using the Hungarian algorithm to find optimal pairings based on overall similarity scores.

## Limitations

### PDF Extraction
- Limited to text-based extraction using pdf-parse
- No access to actual positioning data without specialized PDF libraries
- Positioning estimates may be inaccurate for complex layouts

### DOCX Extraction  
- Relies on XML parsing of document structure
- Positioning calculations are approximate
- Complex features (tables, images) have simplified handling

### Style Comparison
- Limited to common CSS properties
- Format-specific styling may not translate directly
- Font rendering differences between formats

## Best Practices

### Test Organization

```typescript
describe('Visual Comparison: Element Types', () => {
  // Group tests by element type for better organization
  describe('Headings', () => {
    it('should handle heading levels consistently', async () => {
      // Test all heading levels 1-6
    });
  });

  describe('Paragraphs', () => {
    it('should handle various text styling', async () => {
      // Test bold, italic, underline, etc.
    });
  });

  describe('Lists', () => {
    it('should handle ordered and unordered lists', async () => {
      // Test list formatting and nesting
    });
  });
});
```

### Tolerance Tuning

Start with strict tolerances and gradually relax them based on actual differences:

```typescript
// Start strict
let config = { positionTolerance: 1.0, sizeTolerance: 0.5 };

// Analyze results and adjust
if (result.similarity < threshold) {
  const report = VisualTestUtils.generateComparisonReport(result);
  console.log(report);
  
  // Adjust tolerances based on common differences
  config = { positionTolerance: 3.0, sizeTolerance: 2.0 };
}
```

### Performance Considerations

- Use smaller test documents for fast feedback
- Cache adapter instances to avoid repeated initialization
- Run visual tests separately from unit tests due to processing overhead
- Consider parallel test execution for large test suites

## Dependencies

The visual testing system requires several optional dependencies:

```json
{
  "optionalDependencies": {
    "jszip": "^3.10.1",           // DOCX document parsing
    "fast-xml-parser": "^4.3.4",  // XML parsing for DOCX content
    "pdf-parse": "^1.1.1",        // Basic PDF text extraction
    "pdf-lib": "^1.17.1"          // Advanced PDF manipulation
  }
}
```

Install them as needed:

```bash
npm install jszip fast-xml-parser pdf-parse pdf-lib
```

## Future Enhancements

- Integration with headless browser for pixel-perfect comparisons
- Support for more document formats (RTF, ODT, etc.)
- Advanced PDF parsing with positioning data
- Machine learning-based similarity scoring
- Visual diff generation with highlighted differences
- Performance optimization for large documents