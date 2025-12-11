import { describe, expect, it } from 'vitest';
import {
  computeInheritedStyles,
  filterForScope,
} from '../src/styles/style-inheritance';
import { Styles } from '../src/types';

describe('style-inheritance', () => {
  describe('computeInheritedStyles', () => {
    it('should inherit inheritable properties like fontFamily', () => {
      const parentStyles: Styles = {
        fontFamily: 'Arial',
        color: 'red',
      };

      const result = computeInheritedStyles({
        parentStyles,
        parentScope: 'tableCell',
        childScope: 'block',
      });

      expect(result).toEqual({
        fontFamily: 'Arial',
        color: 'red',
      });
    });

    it('should NOT inherit non-inheritable properties like border', () => {
      const parentStyles: Styles = {
        border: '1px solid black',
        padding: '10px',
        fontFamily: 'Arial',
      };

      const result = computeInheritedStyles({
        parentStyles,
        parentScope: 'tableCell',
        childScope: 'block',
      });

      expect(result).toEqual({
        fontFamily: 'Arial',
      });
    });

    it('should NOT inherit properties if parent scope is invalid', () => {
      // Assuming fontFamily is inheritable, but if we say parent is something weird...
      // Actually fontFamily scopes includes 'block', 'inline', 'tableCell'.
      // usage: computeInheritedStyles checks if property.meta.scopes includes parentScope

      const parentStyles: Styles = {
        fontFamily: 'Arial',
      };

      // 'table' is NOT in fontFamily scopes?
      // fontFamily: scopes: ['block', 'inline', 'tableCell']

      const result = computeInheritedStyles({
        parentStyles,
        parentScope: 'table',
        childScope: 'block',
      });

      expect(result).toEqual({});
    });
  });

  describe('filterForScope', () => {
    it('should only keep properties valid for the scope', () => {
      const styles: Styles = {
        fontFamily: 'Arial', // valid for block
        border: '1px solid black', // valid for block? YES in my definition: scopes: ['tableCell', 'block', 'table']
        unknownProp: 'value', // default: valid for all
      };

      // Let's check definition again
      // border: scopes: ['tableCell', 'block', 'table']

      const result = filterForScope(styles, 'block');
      expect(result).toEqual({
        fontFamily: 'Arial',
        border: '1px solid black',
        unknownProp: 'value',
      });
    });

    it('should filter out properties not valid for scope', () => {
      // I need a property NOT valid for block.
      // verticalAlign: scopes: ['tableCell', 'inline']

      const styles: Styles = {
        verticalAlign: 'middle',
        fontFamily: 'Arial',
      };

      const result = filterForScope(styles, 'block');
      expect(result).toEqual({
        fontFamily: 'Arial',
      });
    });
  });
});
