import { ElementType } from '../types';

/**
 * Represents a positioned element in a document with spatial and style information
 * for visual comparison testing across different adapters.
 */
export interface PositionedElement {
  /** ID that matches the source DocumentElement */
  id: string;

  /** Absolute position on page in points (pt) */
  position: {
    x: number;
    y: number;
  };

  /** Size of the element's bounding box in points (pt) */
  size: {
    width: number;
    height: number;
  };

  /** Page number (0-indexed) */
  page: number;

  /** Optional styling metadata (from renderer or inferred) */
  style?: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    color?: string;
    backgroundColor?: string;
    lineHeight?: number;
    alignment?: 'left' | 'right' | 'center' | 'justify';
    verticalAlign?: 'baseline' | 'sub' | 'super';
    [key: string]: unknown;
  };

  /** Optional layout relationships */
  relationships?: {
    below?: string; // id of element it's below
    alignedWith?: string; // id of horizontally aligned peer
    inside?: string; // e.g. parent table cell
    overlapping?: string[]; // ids of elements it overlaps
  };

  /** Original type (heading, list, paragraph, etc.) */
  type: ElementType;

  /** Optional plain text for verification */
  text?: string;

  /** Optional metadata for testing context */
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Document layout representation containing all positioned elements
 */
export interface DocumentLayout {
  /** Array of positioned elements */
  elements: PositionedElement[];

  /** Document dimensions */
  pages: Array<{
    width: number;
    height: number;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  }>;

  /** Metadata about the document */
  metadata?: {
    format: string;
    generatedAt: Date;
    [key: string]: unknown;
  };
}

/**
 * Comparison result between two document layouts
 */
export interface LayoutComparisonResult {
  /** Overall similarity score (0-1, where 1 is identical) */
  similarity: number;

  /** Individual element comparisons */
  elementComparisons: Array<{
    id1: string;
    id2: string;
    positionDelta: { x: number; y: number };
    sizeDelta: { width: number; height: number };
    styleMatches: boolean;
    textMatches: boolean;
    similarity: number;
  }>;

  /** Elements that couldn't be matched */
  unmatchedElements: {
    layout1: string[];
    layout2: string[];
  };

  /** Summary of differences */
  differences: {
    type: 'position' | 'size' | 'style' | 'text' | 'missing' | 'extra';
    elementId: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

/**
 * Configuration for layout comparison
 */
export interface ComparisonConfig {
  /** Tolerance for position differences (in points) */
  positionTolerance: number;

  /** Tolerance for size differences (in points) */
  sizeTolerance: number;

  /** Whether to compare text content exactly */
  exactTextMatch: boolean;

  /** Whether to compare styling */
  compareStyles: boolean;

  /** Minimum similarity threshold to consider elements matching */
  matchingThreshold: number;

  /** Whether to consider page boundaries */
  respectPageBoundaries: boolean;
}

/**
 * Interface for document renderers that can extract spatial information
 */
export interface DocumentRenderer {
  /** Extract positioned elements from a document buffer */
  extractLayout(buffer: Buffer): Promise<DocumentLayout>;

  /** Get the format this renderer handles */
  getFormat(): string;

  /** Check if this renderer can handle the given buffer */
  canHandle(buffer: Buffer): boolean;
}
