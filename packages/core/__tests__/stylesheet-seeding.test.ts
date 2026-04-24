import { describe, expect, it } from 'vitest';
import {
  createBaseStylesheet,
  createStylesheet,
  defaultStylesToStylesheetRules,
  tagDefaultStylesToStylesheetRules,
} from '../src';

describe('stylesheet seeding', () => {
  it('seeds parser built-in tag defaults into a base stylesheet', () => {
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

    expect(
      stylesheet.getMatchedStyles({
        type: 'text',
        metadata: { tagName: 'sup' },
      })
    ).toEqual({
      verticalAlign: 'super',
    });

    expect(
      stylesheet.getMatchedStyles({
        type: 'paragraph',
        metadata: { tagName: 'pre' },
      })
    ).toEqual({
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
    });

    expect(
      stylesheet.getMatchedStyles({
        type: 'paragraph',
        metadata: { tagName: 'blockquote' },
      })
    ).toEqual({
      borderLeftColor: 'lightGray',
      borderLeftStyle: 'solid',
      borderLeftWidth: 2,
      paddingLeft: '16px',
      marginLeft: '24px',
    });

    expect(
      stylesheet.getMatchedStyles({
        type: 'paragraph',
        metadata: { tagName: 'dd' },
      })
    ).toEqual({
      marginLeft: '40px',
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

  it('converts tag defaultStyles into stylesheet tag rules', () => {
    const stylesheet = createStylesheet(
      tagDefaultStylesToStylesheetRules([
        { key: 'p', styles: { color: 'red' } },
        { key: 'table', styles: { borderStyle: 'solid' } },
      ])
    );

    expect(
      stylesheet.getMatchedStyles({
        type: 'paragraph',
        metadata: { tagName: 'p' },
      })
    ).toEqual({ color: 'red' });

    expect(
      stylesheet.getMatchedStyles({
        type: 'table',
        metadata: { tagName: 'table' },
      })
    ).toEqual({ borderStyle: 'solid' });
  });
});
