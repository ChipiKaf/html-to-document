import { Paragraph } from 'docx';
import type { ListItemElement } from 'html-to-document-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListConverter } from '../src/element-converters/block/list';
import type { ElementConverterDependencies } from '../src/element-converters/types';

vi.mock('docx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('docx')>();

  return {
    ...actual,
    Paragraph: vi.fn((options) => ({ options })),
  };
});

describe('ListConverter', () => {
  let converter: ListConverter;

  beforeEach(() => {
    converter = new ListConverter();
    vi.mocked(Paragraph).mockClear();
  });

  it('should apply styles to both paragraph-level and run-level', async () => {
    const element: ListItemElement = {
      type: 'list-item',
      scope: 'block',
      level: 1,
      content: [],
      metadata: { reference: 'ordered' },
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
      defaultStyles: { 'list-item': {} },
      stylesheet: mockStylesheet,
      styleMeta: {},
    } as unknown as ElementConverterDependencies;

    const result = await converter.convertListItem(dependencies, element);

    expect(result).toHaveLength(1);
    expect(Paragraph).toHaveBeenCalledWith({
      numbering: {
        reference: 'ordered',
        level: 1,
      },
      run: {
        bold: true,
        fontSize: 12,
      },
      children: { ...mockStylesheet },
      bold: true,
      fontSize: 12,
    });
  });
});
