import { DocumentElement, Styles } from '../types';

type StylesheetValue = string | number;

export interface StyleRule {
  kind: 'style';
  selectors: readonly string[];
  declarations: Styles;
}

export interface AtRule<Name extends string = string> {
  kind: 'at-rule';
  name: Name; // 'page', 'media', 'font-face', etc.

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
   * Convenience API for at-rules.
   */
  // addAtRule<Name extends string = string>(rule: AtRule<Name>): void;

  /**
   * Expose raw statements for adapters / advanced consumers.
   * Preserve insertion order.
   */
  getStatements(): readonly StylesheetStatement[];

  /**
   * Convenience query for adapters.
   */
  getAtRules<Name extends string = string>(
    name?: Name
  ): readonly AtRule<Name>[];

  /**
   * Element-style resolution only.
   * Should consider normal style rules, not document-level at-rules like @page.
   */
  resolveDefaultStyles(selector: string): Styles;
  getComputedStyles(element: DocumentElement): Styles;
}
