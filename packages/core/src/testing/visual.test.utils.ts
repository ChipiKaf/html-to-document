import { DocumentElement } from '../types';
import {
  DocumentLayout,
  LayoutComparisonResult,
  ComparisonConfig,
} from './spatial.types';
import { LayoutComparator } from './layout.comparator';
import { RendererRegistry } from './renderer.registry';

/**
 * Utility class for visual testing of document adapters
 */
export class VisualTestUtils {
  private static registry = RendererRegistry.getInstance();
  private static comparator = new LayoutComparator();

  /**
   * Compare visual output between two document adapters
   */
  static async compareAdapterOutputs(
    adapter1: { convert(elements: DocumentElement[]): Promise<Buffer> },
    adapter2: { convert(elements: DocumentElement[]): Promise<Buffer> },
    elements: DocumentElement[],
    config?: Partial<ComparisonConfig>
  ): Promise<LayoutComparisonResult> {
    // Generate documents from both adapters
    const [buffer1, buffer2] = await Promise.all([
      adapter1.convert(elements),
      adapter2.convert(elements),
    ]);

    // Extract layouts from both documents
    const [layout1, layout2] = await Promise.all([
      this.extractLayout(buffer1),
      this.extractLayout(buffer2),
    ]);

    // Compare layouts
    const comparator = config ? new LayoutComparator(config) : this.comparator;
    return comparator.compare(layout1, layout2);
  }

  /**
   * Compare DOCX and PDF outputs for the same document elements
   */
  static async compareDocxToPdf(
    docxAdapter: { convert(elements: DocumentElement[]): Promise<Buffer> },
    pdfAdapter: { convert(elements: DocumentElement[]): Promise<Buffer> },
    elements: DocumentElement[],
    config?: Partial<ComparisonConfig>
  ): Promise<LayoutComparisonResult> {
    return this.compareAdapterOutputs(
      docxAdapter,
      pdfAdapter,
      elements,
      config
    );
  }

  /**
   * Extract layout from a document buffer
   */
  static async extractLayout(buffer: Buffer): Promise<DocumentLayout> {
    const renderer = this.registry.findRenderer(buffer);
    if (!renderer) {
      throw new Error('No suitable renderer found for document format');
    }

    return renderer.extractLayout(buffer);
  }

  /**
   * Generate a detailed visual comparison report
   */
  static generateComparisonReport(result: LayoutComparisonResult): string {
    const lines: string[] = [];

    lines.push('=== Visual Comparison Report ===');
    lines.push(`Overall Similarity: ${(result.similarity * 100).toFixed(2)}%`);
    lines.push('');

    if (result.elementComparisons.length > 0) {
      lines.push('Element Comparisons:');
      for (const comp of result.elementComparisons) {
        lines.push(`  ${comp.id1} ↔ ${comp.id2}:`);
        lines.push(`    Similarity: ${(comp.similarity * 100).toFixed(2)}%`);

        if (
          Math.abs(comp.positionDelta.x) > 0.1 ||
          Math.abs(comp.positionDelta.y) > 0.1
        ) {
          lines.push(
            `    Position Δ: (${comp.positionDelta.x.toFixed(2)}, ${comp.positionDelta.y.toFixed(2)})`
          );
        }

        if (
          Math.abs(comp.sizeDelta.width) > 0.1 ||
          Math.abs(comp.sizeDelta.height) > 0.1
        ) {
          lines.push(
            `    Size Δ: (${comp.sizeDelta.width.toFixed(2)}, ${comp.sizeDelta.height.toFixed(2)})`
          );
        }

        if (!comp.styleMatches) {
          lines.push('    Style: ❌ Different');
        }

        if (!comp.textMatches) {
          lines.push('    Text: ❌ Different');
        }

        lines.push('');
      }
    }

    if (result.unmatchedElements.layout1.length > 0) {
      lines.push('Unmatched elements in first layout:');
      for (const id of result.unmatchedElements.layout1) {
        lines.push(`  - ${id}`);
      }
      lines.push('');
    }

    if (result.unmatchedElements.layout2.length > 0) {
      lines.push('Unmatched elements in second layout:');
      for (const id of result.unmatchedElements.layout2) {
        lines.push(`  - ${id}`);
      }
      lines.push('');
    }

    if (result.differences.length > 0) {
      lines.push('Detailed Differences:');
      const groupedDifferences = this.groupDifferencesBySeverity(
        result.differences
      );

      for (const [severity, diffs] of Object.entries(groupedDifferences)) {
        if (diffs.length > 0) {
          lines.push(`  ${severity.toUpperCase()} (${diffs.length}):`);
          for (const diff of diffs) {
            lines.push(`    - ${diff.description}`);
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Create Jest matcher for visual similarity
   */
  static createJestMatcher(threshold: number = 0.95): {
    toBeVisuallySimilar(
      received: LayoutComparisonResult,
      expected?: number
    ): {
      message: () => string;
      pass: boolean;
    };
  } {
    return {
      toBeVisuallySimilar(
        received: LayoutComparisonResult,
        expected?: number
      ): {
        message: () => string;
        pass: boolean;
      } {
        const actualThreshold = expected ?? threshold;
        const pass = received.similarity >= actualThreshold;

        if (pass) {
          return {
            message: (): string =>
              `Expected similarity ${(received.similarity * 100).toFixed(2)}% to be less than ${(actualThreshold * 100).toFixed(2)}%`,
            pass: true,
          };
        } else {
          const report: string =
            VisualTestUtils.generateComparisonReport(received);
          return {
            message: (): string =>
              `Expected similarity ${(received.similarity * 100).toFixed(2)}% to be at least ${(actualThreshold * 100).toFixed(2)}%\n\n${report}`,
            pass: false,
          };
        }
      },
    };
  }

  /**
   * Assert that two adapters produce visually similar output
   */
  static async assertVisualSimilarity(
    adapter1: { convert(elements: DocumentElement[]): Promise<Buffer> },
    adapter2: { convert(elements: DocumentElement[]): Promise<Buffer> },
    elements: DocumentElement[],
    threshold: number = 0.95,
    config?: Partial<ComparisonConfig>
  ): Promise<void> {
    const result = await this.compareAdapterOutputs(
      adapter1,
      adapter2,
      elements,
      config
    );

    if (result.similarity < threshold) {
      const report = this.generateComparisonReport(result);
      throw new Error(
        `Visual similarity ${(result.similarity * 100).toFixed(2)}% is below threshold ${(threshold * 100).toFixed(2)}%\n\n${report}`
      );
    }
  }

  /**
   * Group differences by severity for better reporting
   */
  private static groupDifferencesBySeverity(
    differences: LayoutComparisonResult['differences']
  ): Record<string, typeof differences> {
    return differences.reduce(
      (groups, diff) => {
        const severity = diff.severity;
        if (!groups[severity]) {
          groups[severity] = [];
        }
        groups[severity].push(diff);
        return groups;
      },
      {} as Record<string, typeof differences>
    );
  }

  /**
   * Create a test helper for comparing specific document element types
   */
  static async testElementType(
    adapters: Array<{
      convert(elements: DocumentElement[]): Promise<Buffer>;
      name: string;
    }>,
    elementType: DocumentElement['type'],
    testElements: DocumentElement[],
    config?: Partial<ComparisonConfig>
  ): Promise<Map<string, LayoutComparisonResult[]>> {
    const results = new Map<string, LayoutComparisonResult[]>();

    // Filter elements by type
    const filteredElements = testElements.filter(
      (el) => el.type === elementType
    );

    if (filteredElements.length === 0) {
      throw new Error(
        `No elements of type '${elementType}' found in test data`
      );
    }

    // Compare each adapter with every other adapter
    for (let i = 0; i < adapters.length; i++) {
      for (let j = i + 1; j < adapters.length; j++) {
        const adapter1 = adapters[i];
        const adapter2 = adapters[j];
        const comparisonKey = `${adapter1.name} vs ${adapter2.name}`;

        const result = await this.compareAdapterOutputs(
          adapter1,
          adapter2,
          filteredElements,
          config
        );

        if (!results.has(comparisonKey)) {
          results.set(comparisonKey, []);
        }
        results.get(comparisonKey)!.push(result);
      }
    }

    return results;
  }
}
