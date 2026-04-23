import Specificity from '@bramus/specificity';
import selectorParser from 'postcss-selector-parser';
import { Styles, DocumentElement } from '../types';

export type StylesheetValue = string | number;

export interface SelectorTarget {
  tagName?: string;
  id?: string;
  classes: Set<string>;
  attributes: Record<string, string>;
}

export interface CompiledStyleRule {
  selector: string;
  declarations: Styles;
  specificity: Specificity;
  order: number;
  ast: selectorParser.Selector;
}

export interface StyleRule {
  kind: 'style';
  selectors: readonly string[];
  declarations: Styles;
}

export interface AtRule<Name extends string = string> {
  kind: 'at-rule';
  name: Name;

  /**
   * Raw text after the at-rule name.
   * Examples:
   *   @page :first      -> ':first'
   *   @media print      -> 'print'
   *   @import url(...)  -> 'url(...)'
   */
  prelude?: string;

  /**
   * Block descriptors, for at-rules that have declarations.
   * Example:
   *   @page { size: A4; margin: 1in; }
   */
  descriptors?: Readonly<Record<string, StylesheetValue>>;

  /**
   * Nested statements for block at-rules like @media,
   * and for things like margin boxes inside @page.
   */
  children?: readonly StylesheetStatement[];
}

export type StylesheetStatement = StyleRule | AtRule;

export interface IStylesheet {
  /**
   * Generic append API.
   */
  add(statement: StylesheetStatement): void;

  /**
   * Convenience API for normal selector rules.
   */
  addStyleRule(
    selectors: string | readonly string[],
    declarations: Styles
  ): void;

  /**
   * Backwards-compatible alias for addStyleRule.
   */
  addRule(selector: string, styles: Styles): void;

  /**
   * Convenience API for at-rules.
   */
  addAtRule<Name extends string = string>(rule: AtRule<Name>): void;

  /**
   * Expose raw statements for adapters / advanced consumers.
   * Preserve insertion order.
   */
  getStatements(): readonly StylesheetStatement[];

  /**
   * Convenience query for adapters.
   * Returns top-level at-rules only.
   */
  getAtRules<Name extends string = string>(
    name?: Name
  ): readonly AtRule<Name>[];

  getComputedStylesBySelector(selector: string): Styles;
  getComputedStyles(element: DocumentElement): Styles;
}
