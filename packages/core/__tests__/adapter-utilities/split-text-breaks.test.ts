import { describe, it, expect } from 'vitest';
import { splitTextElementByLineBreaks } from '../../src/adapter-utilities/split-text-breaks';

describe('splitTextBreaks', () => {
  it('should keep a single text element if it only contains text without line breaks', () => {
    const result = splitTextElementByLineBreaks({
      type: 'text',
      text: 'Hello, world!',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      text: 'Hello, world!',
    });
  });

  it('should add break metadata for trailing line breaks', () => {
    const result = splitTextElementByLineBreaks({
      type: 'text',
      text: 'Hello\n\n',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      text: 'Hello',
      metadata: {
        break: 2,
      },
    });
  });

  it('should split text element by line breaks and preserve break metadata', () => {
    const result = splitTextElementByLineBreaks({
      type: 'text',
      text: 'Line 1\nLine 2\n\nLine 4',
      metadata: {
        customData: 'example',
      },
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: 'text',
      text: 'Line 1',
      metadata: {
        customData: 'example',
        break: 1,
      },
    });
    expect(result[1]).toEqual({
      type: 'text',
      text: 'Line 2',
      metadata: {
        customData: 'example',
        break: 2,
      },
    });
    expect(result[2]).toEqual({
      type: 'text',
      text: 'Line 4',
      metadata: {
        customData: 'example',
      },
    });
  });

  it('should handle text starting with line breaks', () => {
    const result = splitTextElementByLineBreaks({
      type: 'text',
      text: '\n\nStart here',
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'text',
      text: '',
      metadata: {
        break: 2,
      },
    });
    expect(result[1]).toEqual({
      type: 'text',
      text: 'Start here',
    });
  });
});
