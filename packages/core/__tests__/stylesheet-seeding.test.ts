import { describe, expect, it } from 'vitest';
import {
  createBaseStylesheet,
  createStylesheet,
  defaultStylesToStylesheetRules,
} from '../src';

describe('stylesheet seeding', () => {
  it('seeds parser built-in heading defaults into a base stylesheet', () => {
    const stylesheet = createBaseStylesheet();

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 1,
        metadata: { tagName: 'h1' },
      })
    ).toEqual({
      fontSize: '32px',
      fontWeight: 'bold',
    });

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 2,
        metadata: { tagName: 'h2' },
      })
    ).toEqual({
      fontSize: '24px',
      fontWeight: 'bold',
    });

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 6,
        metadata: { tagName: 'h6' },
      })
    ).toEqual({
      fontWeight: 'bold',
    });
  });

  it('converts legacy element-type defaultStyles into stylesheet rules', () => {
    const stylesheet = createStylesheet(
      defaultStylesToStylesheetRules({
        heading: { color: 'purple' },
        paragraph: { lineHeight: 1.5 },
        text: { fontFamily: 'Aptos' },
      })
    );

    expect(
      stylesheet.getMatchedStyles({
        type: 'heading',
        level: 3,
      })
    ).toEqual({ color: 'purple' });

    expect(
      stylesheet.getMatchedStyles({
        type: 'paragraph',
      })
    ).toEqual({ lineHeight: 1.5 });

    expect(
      stylesheet.getMatchedStyles({
        type: 'text',
        text: 'Hello world',
      })
    ).toEqual({ fontFamily: 'Aptos' });
  });
});
