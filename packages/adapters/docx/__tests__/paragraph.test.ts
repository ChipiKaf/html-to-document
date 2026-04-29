import { Paragraph } from 'docx';
import type { ParagraphElement } from 'html-to-document-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParagraphConverter } from '../src/element-converters/block/paragraph';
import type { ElementConverterDependencies } from '../src/element-converters/types';

vi.mock('docx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('docx')>();

  return {
    ...actual,
    Paragraph: vi.fn((options) => ({ options })),
  };
});

describe('ParagraphConverter', () => {
  let converter: ParagraphConverter;

  beforeEach(() => {
    converter = new ParagraphConverter();
    vi.mocked(Paragraph).mockClear();
  });

  it('should apply styles to both paragraph-level and run-level', async () => {
    const element: ParagraphElement = {
      type: 'paragraph',
      scope: 'block',
      styles: { fontWeight: 'bold', fontSize: 12 },
    };

    const mockStyleMapper = {
      mapStyles: vi.fn().mockReturnValue({ bold: true, fontSize: 12 }),
    };

    const mockStylesheet = {
      getComputedStyles: vi.fn().mockReturnValue({}),
      getMatchedStyles: vi.fn().mockReturnValue([]),
    };

    const mockConverter = {
      convertToBlocks: vi.fn((config) => {
        const result = config.wrapInlineElements([], 0);
        return Promise.resolve(result);
      }),
      runFallthroughWrapConvertedChildren: vi.fn((_, children) => children),
      runFallthroughNestedBlock: vi.fn((_, __, childBlock) => childBlock),
      convertBlock: vi.fn(),
    };

    const dependencies = {
      styleMapper: mockStyleMapper,
      converter: mockConverter,
      defaultStyles: { paragraph: {} },
      stylesheet: mockStylesheet,
      styleMeta: {},
    } as unknown as ElementConverterDependencies;

    const result = await converter.convertElement(dependencies, element);

    expect(result).toHaveLength(1);
    expect(Paragraph).toHaveBeenCalledWith({
      children: { ...mockStylesheet },
      bold: true,
      fontSize: 12,
      run: {
        bold: true,
        fontSize: 12,
      },
    });
  });
});
