import {
  HeadingConverter,
  IdInlineConverter,
  LineConverter,
  LinkConverter,
  ListConverter,
  ParagraphConverter,
  TableConverter,
  TextConverter,
} from 'html-to-document-adapter-docx/element-converters';
import { describe, expect, it } from 'vitest';

describe('e2e tests for docx adapter element converters', () => {
  it('should allow element converters to be imported', () => {
    expect(HeadingConverter).toBeDefined();
    expect(LineConverter).toBeDefined();
    expect(ListConverter).toBeDefined();
    expect(ParagraphConverter).toBeDefined();
    expect(TableConverter).toBeDefined();

    expect(IdInlineConverter).toBeDefined();

    expect(LinkConverter).toBeDefined();
    expect(TextConverter).toBeDefined();
  });
});
