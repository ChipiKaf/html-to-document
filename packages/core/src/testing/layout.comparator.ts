import {
  DocumentLayout,
  PositionedElement,
  LayoutComparisonResult,
  ComparisonConfig,
} from './spatial.types';

/**
 * Default configuration for layout comparison
 */
export const DEFAULT_COMPARISON_CONFIG: ComparisonConfig = {
  positionTolerance: 2.0, // 2 points tolerance
  sizeTolerance: 1.0, // 1 point tolerance
  exactTextMatch: true,
  compareStyles: true,
  matchingThreshold: 0.8, // 80% similarity required for match
  respectPageBoundaries: true,
};

/**
 * Utility class for comparing document layouts
 */
export class LayoutComparator {
  private config: ComparisonConfig;

  constructor(config: Partial<ComparisonConfig> = {}) {
    this.config = { ...DEFAULT_COMPARISON_CONFIG, ...config };
  }

  /**
   * Compare two document layouts and return detailed comparison result
   */
  compare(
    layout1: DocumentLayout,
    layout2: DocumentLayout
  ): LayoutComparisonResult {
    const elementComparisons: LayoutComparisonResult['elementComparisons'] = [];
    const unmatchedElements = { layout1: [], layout2: [] };
    const differences: LayoutComparisonResult['differences'] = [];

    // Create sets for tracking matched elements
    const matched1 = new Set<string>();
    const matched2 = new Set<string>();

    // Find best matches for each element in layout1
    for (const element1 of layout1.elements) {
      let bestMatch: PositionedElement | null = null;
      let bestSimilarity = 0;

      for (const element2 of layout2.elements) {
        if (matched2.has(element2.id)) continue;

        const similarity = this.calculateElementSimilarity(element1, element2);
        if (
          similarity > bestSimilarity &&
          similarity >= this.config.matchingThreshold
        ) {
          bestMatch = element2;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch) {
        matched1.add(element1.id);
        matched2.add(bestMatch.id);

        const comparison = this.compareElements(element1, bestMatch);
        elementComparisons.push(comparison);

        // Add differences based on comparison
        this.addElementDifferences(comparison, differences);
      } else {
        (unmatchedElements.layout1 as string[]).push(element1.id);
        differences.push({
          type: 'missing',
          elementId: element1.id,
          description: `Element "${element1.id}" from layout1 has no match in layout2`,
          severity: 'medium',
        });
      }
    }

    // Find unmatched elements in layout2
    for (const element2 of layout2.elements) {
      if (!matched2.has(element2.id)) {
        (unmatchedElements.layout2 as string[]).push(element2.id);
        differences.push({
          type: 'extra',
          elementId: element2.id,
          description: `Element "${element2.id}" from layout2 has no match in layout1`,
          severity: 'medium',
        });
      }
    }

    // Calculate overall similarity
    const totalElements = Math.max(
      layout1.elements.length,
      layout2.elements.length
    );
    const matchedCount = elementComparisons.length;
    const avgElementSimilarity =
      matchedCount > 0
        ? elementComparisons.reduce((sum, comp) => sum + comp.similarity, 0) /
          matchedCount
        : 0;

    const similarity =
      totalElements > 0
        ? (matchedCount / totalElements) * avgElementSimilarity
        : 1;

    return {
      similarity,
      elementComparisons,
      unmatchedElements,
      differences,
    };
  }

  /**
   * Calculate similarity between two positioned elements
   */
  private calculateElementSimilarity(
    elem1: PositionedElement,
    elem2: PositionedElement
  ): number {
    let score = 0;
    let maxScore = 0;

    // Type similarity (must match)
    maxScore += 1;
    if (elem1.type === elem2.type) {
      score += 1;
    } else {
      return 0; // Different types can't be similar
    }

    // Page similarity (if respecting page boundaries)
    if (this.config.respectPageBoundaries) {
      maxScore += 1;
      if (elem1.page === elem2.page) {
        score += 1;
      } else {
        return 0; // Different pages can't be similar if respecting boundaries
      }
    }

    // Position similarity
    maxScore += 2;
    const positionDistance = Math.sqrt(
      Math.pow(elem1.position.x - elem2.position.x, 2) +
        Math.pow(elem1.position.y - elem2.position.y, 2)
    );
    if (positionDistance <= this.config.positionTolerance) {
      score += 2;
    } else {
      // Gradual scoring based on distance
      const maxDistance = 50; // Consider elements very different if >50pt apart
      score += Math.max(0, 2 * (1 - positionDistance / maxDistance));
    }

    // Size similarity
    maxScore += 2;
    const sizeDistance = Math.sqrt(
      Math.pow(elem1.size.width - elem2.size.width, 2) +
        Math.pow(elem1.size.height - elem2.size.height, 2)
    );
    if (sizeDistance <= this.config.sizeTolerance) {
      score += 2;
    } else {
      const maxSizeDistance = 20;
      score += Math.max(0, 2 * (1 - sizeDistance / maxSizeDistance));
    }

    // Text similarity
    if (elem1.text || elem2.text) {
      maxScore += 3;
      if (this.config.exactTextMatch) {
        if (elem1.text === elem2.text) {
          score += 3;
        }
      } else {
        // Use normalized text comparison
        const text1 = this.normalizeText(elem1.text || '');
        const text2 = this.normalizeText(elem2.text || '');
        if (text1 === text2) {
          score += 3;
        } else {
          // Use string similarity if texts are different
          score += 3 * this.calculateStringSimilarity(text1, text2);
        }
      }
    }

    // Style similarity
    if (this.config.compareStyles && (elem1.style || elem2.style)) {
      maxScore += 2;
      score += 2 * this.calculateStyleSimilarity(elem1.style, elem2.style);
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Compare two elements and return detailed comparison
   */
  private compareElements(elem1: PositionedElement, elem2: PositionedElement) {
    const positionDelta = {
      x: elem2.position.x - elem1.position.x,
      y: elem2.position.y - elem1.position.y,
    };

    const sizeDelta = {
      width: elem2.size.width - elem1.size.width,
      height: elem2.size.height - elem1.size.height,
    };

    const styleMatches = this.config.compareStyles
      ? this.calculateStyleSimilarity(elem1.style, elem2.style) > 0.9
      : true;

    const textMatches = this.config.exactTextMatch
      ? elem1.text === elem2.text
      : this.normalizeText(elem1.text || '') ===
        this.normalizeText(elem2.text || '');

    const similarity = this.calculateElementSimilarity(elem1, elem2);

    return {
      id1: elem1.id,
      id2: elem2.id,
      positionDelta,
      sizeDelta,
      styleMatches,
      textMatches,
      similarity,
    };
  }

  /**
   * Add differences based on element comparison
   */
  private addElementDifferences(
    comparison: LayoutComparisonResult['elementComparisons'][0],
    differences: LayoutComparisonResult['differences']
  ): void {
    const { positionDelta, sizeDelta, styleMatches, textMatches } = comparison;

    // Position differences
    const positionDistance = Math.sqrt(
      positionDelta.x ** 2 + positionDelta.y ** 2
    );
    if (positionDistance > this.config.positionTolerance) {
      differences.push({
        type: 'position',
        elementId: comparison.id1,
        description: `Position differs by ${positionDistance.toFixed(2)}pt (x: ${positionDelta.x.toFixed(2)}, y: ${positionDelta.y.toFixed(2)})`,
        severity:
          positionDistance > 10
            ? 'high'
            : positionDistance > 5
              ? 'medium'
              : 'low',
      });
    }

    // Size differences
    const sizeDistance = Math.sqrt(
      sizeDelta.width ** 2 + sizeDelta.height ** 2
    );
    if (sizeDistance > this.config.sizeTolerance) {
      differences.push({
        type: 'size',
        elementId: comparison.id1,
        description: `Size differs by ${sizeDistance.toFixed(2)}pt (width: ${sizeDelta.width.toFixed(2)}, height: ${sizeDelta.height.toFixed(2)})`,
        severity:
          sizeDistance > 5 ? 'high' : sizeDistance > 2 ? 'medium' : 'low',
      });
    }

    // Style differences
    if (this.config.compareStyles && !styleMatches) {
      differences.push({
        type: 'style',
        elementId: comparison.id1,
        description: 'Styling differences detected',
        severity: 'medium',
      });
    }

    // Text differences
    if (!textMatches) {
      differences.push({
        type: 'text',
        elementId: comparison.id1,
        description: 'Text content differs',
        severity: 'high',
      });
    }
  }

  /**
   * Calculate similarity between two style objects
   */
  private calculateStyleSimilarity(
    style1?: PositionedElement['style'],
    style2?: PositionedElement['style']
  ): number {
    if (!style1 && !style2) return 1;
    if (!style1 || !style2) return 0;

    const keys = new Set([...Object.keys(style1), ...Object.keys(style2)]);
    let matches = 0;

    for (const key of keys) {
      if (style1[key] === style2[key]) {
        matches++;
      }
    }

    return keys.size > 0 ? matches / keys.size : 1;
  }

  /**
   * Calculate string similarity using simple algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);

    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
