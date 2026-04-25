import Specificity from '@bramus/specificity';
import selectorParser from 'postcss-selector-parser';
import { DocumentElement, Styles } from '../types';
import { LEGACY_ELEMENT_TYPE_SELECTOR_ATTRIBUTE } from './constants';
import type {
  SelectorTarget,
  StylesheetStatement,
  StyleRule,
  AtRule,
  IStylesheet,
  CompiledStyleRule,
} from './interfaces';

export type {
  StylesheetValue,
  StylesheetStatement,
  StyleRule,
  AtRule,
  IStylesheet,
} from './interfaces';

const DEFAULT_TAG_BY_TYPE: Partial<Record<DocumentElement['type'], string>> = {
  paragraph: 'p',
  image: 'img',
  line: 'hr',
  table: 'table',
  'table-row': 'tr',
  'table-cell': 'td',
  header: 'header',
  footer: 'footer',
  // text: 'span', // <-- DO NOT add this, as it would cause all text nodes to be treated as <span> elements, which is not desirable for selector matching.
};

export class Stylesheet implements IStylesheet {
  protected readonly statements: StylesheetStatement[] = [];
  protected readonly compiledStyleRules: CompiledStyleRule[] = [];
  protected readonly selectorProcessor: ReturnType<typeof selectorParser>;
  protected nextOrder = 0;

  constructor(statements: readonly StylesheetStatement[] = []) {
    this.selectorProcessor = selectorParser();
    statements.forEach((statement) => this.add(statement));
  }

  add(statement: StylesheetStatement): void {
    if (statement.kind === 'style') {
      const normalized = this.normalizeStyleStatement(statement);
      this.statements.push(normalized);

      for (const selector of normalized.selectors) {
        this.compiledStyleRules.push(
          this.compileStyleRule(normalized, selector)
        );
      }

      return;
    }

    this.statements.push(this.normalizeAtRule(statement));
  }

  // REFACTOR: this is currently implemented by re-adding all statements, which is not very efficient. We should optimize this by directly manipulating the internal arrays instead.
  prepend(statements: StylesheetStatement | StylesheetStatement[]): void {
    const incomingStatements = Array.isArray(statements)
      ? statements
      : [statements];

    if (incomingStatements.length === 0) {
      return;
    }

    const nextStatements = [
      ...incomingStatements,
      ...this.getStatements(),
    ] satisfies StylesheetStatement[];

    this.statements.length = 0;
    this.compiledStyleRules.length = 0;
    this.nextOrder = 0;

    nextStatements.forEach((statement) => this.add(statement));
  }

  addStyleRule(
    selectors: string | readonly string[],
    declarations: Styles
  ): void {
    this.add({
      kind: 'style',
      selectors: Array.isArray(selectors) ? selectors : [selectors],
      declarations,
    });
  }

  addRule(selector: string, styles: Styles): void {
    this.addStyleRule(selector, styles);
  }

  addAtRule<Name extends string = string>(rule: AtRule<Name>): void {
    this.add(rule);
  }

  getStatements(): readonly StylesheetStatement[] {
    return this.statements.map((statement) => this.cloneStatement(statement));
  }

  getAtRules<Name extends string = string>(
    name?: Name
  ): readonly AtRule<Name>[] {
    return this.statements
      .filter(
        (statement): statement is AtRule<Name> =>
          statement.kind === 'at-rule' &&
          (name === undefined || statement.name === name)
      )
      .map((statement) => this.cloneStatement(statement) as AtRule<Name>);
  }

  getComputedStylesBySelector(selector: string): Styles {
    const targets = this.splitSelectorList(selector)
      .map((entry) => this.toTargetFromSelector(entry))
      .filter((target): target is SelectorTarget => target !== undefined);

    return this.resolveStylesForTargets(targets);
  }

  getMatchedStyles(element: DocumentElement): Styles {
    return this.resolveStylesForTargets([this.toTargetFromElement(element)]);
  }

  getComputedStyles(element: DocumentElement, cascadedStyles?: Styles): Styles {
    return {
      ...cascadedStyles,
      ...this.getMatchedStyles(element),
      ...(element.styles ?? {}),
    };
  }

  subtractStylesBySelector(
    selector: string,
    styleKeys?: readonly (keyof Styles)[]
  ): IStylesheet {
    const targets = this.splitSelectorList(selector)
      .map((entry) => this.toTargetFromSelector(entry))
      .filter((target): target is SelectorTarget => target !== undefined);

    if (targets.length === 0) {
      return this.createDerivedStylesheet(this.getStatements());
    }

    const selectedKeys = styleKeys ? new Set(styleKeys) : undefined;
    const nextStatements = this.getStatements().reduce<StylesheetStatement[]>(
      (statements, statement) => {
        if (statement.kind !== 'style') {
          statements.push(statement);
          return statements;
        }

        const matchingSelectors = statement.selectors.filter((ruleSelector) => {
          const parsedSelector = this.parseSingleSelector(ruleSelector);
          return targets.some((target) =>
            this.matchesSelector(parsedSelector, target)
          );
        });

        if (matchingSelectors.length === 0) {
          statements.push(statement);
          return statements;
        }

        const remainingSelectors = statement.selectors.filter(
          (ruleSelector) => !matchingSelectors.includes(ruleSelector)
        );

        const remainingDeclarations = Object.entries(
          statement.declarations
        ).reduce<Styles>((declarations, [key, value]) => {
          if (selectedKeys && !selectedKeys.has(key as keyof Styles)) {
            declarations[key as keyof Styles] = value;
          }

          return declarations;
        }, {});

        if (remainingSelectors.length > 0) {
          statements.push({
            ...statement,
            selectors: remainingSelectors,
          });
        }

        if (Object.keys(remainingDeclarations).length > 0) {
          statements.push({
            ...statement,
            selectors: matchingSelectors,
            declarations: remainingDeclarations,
          });
        }

        return statements;
      },
      []
    );

    return this.createDerivedStylesheet(nextStatements);
  }

  protected createDerivedStylesheet(
    statements: readonly StylesheetStatement[]
  ): IStylesheet {
    return new Stylesheet(statements);
  }

  protected compileStyleRule(
    statement: StyleRule,
    selector: string
  ): CompiledStyleRule {
    return {
      selector,
      declarations: { ...statement.declarations },
      declarationMeta: statement.declarationMeta
        ? { ...statement.declarationMeta }
        : undefined,
      specificity:
        Specificity.calculate(selector)[0] ||
        new Specificity({ a: 0, b: 0, c: 0 }),
      order: this.nextOrder++,
      ast: this.parseSingleSelector(selector),
    };
  }

  protected splitSelectorList(input: string): string[] {
    return this.selectorProcessor
      .astSync(input)
      .nodes.map((node) => node.toString().trim())
      .filter((selector) => selector.length > 0);
  }

  protected parseSingleSelector(selector: string): selectorParser.Selector {
    const root = this.selectorProcessor.astSync(selector);
    const [parsed] = root.nodes;

    if (!parsed) {
      throw new Error(`Invalid selector: ${selector}`);
    }

    return parsed;
  }

  protected normalizeAttributes(
    element: DocumentElement
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(element.attributes ?? {})) {
      normalized[key.toLowerCase()] = String(value);
    }

    const metadataId = element.metadata?.id;
    if (typeof metadataId === 'string' && normalized.id === undefined) {
      normalized.id = metadataId;
    }

    const metadataClass = element.metadata?.class;
    if (typeof metadataClass === 'string' && normalized.class === undefined) {
      normalized.class = metadataClass;
    }

    const metadataClassName = element.metadata?.className;
    if (
      typeof metadataClassName === 'string' &&
      normalized.class === undefined
    ) {
      normalized.class = metadataClassName;
    }

    normalized[LEGACY_ELEMENT_TYPE_SELECTOR_ATTRIBUTE] = element.type;

    return normalized;
  }

  protected inferTagName(element: DocumentElement): string | undefined {
    const metadataTagName = element.metadata?.tagName;
    if (typeof metadataTagName === 'string' && metadataTagName.length > 0) {
      return metadataTagName.toLowerCase();
    }

    // TODO: the following is kind of opinionated and should probably be removed
    if (element.type === 'heading') {
      const level = 'level' in element ? element.level : undefined;
      if (typeof level === 'number' && level >= 1) {
        return `h${level}`;
      }
    }

    if (element.type === 'list') {
      return 'listType' in element && element.listType === 'ordered'
        ? 'ol'
        : 'ul';
    }

    return DEFAULT_TAG_BY_TYPE[element.type]?.toLowerCase();
  }

  protected toTargetFromElement(element: DocumentElement): SelectorTarget {
    const attributes = this.normalizeAttributes(element);
    const classes = new Set(
      (attributes.class ?? '')
        .split(/\s+/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    );

    return {
      tagName: this.inferTagName(element),
      id: attributes.id,
      classes,
      attributes,
    };
  }

  protected toTargetFromSelector(selector: string): SelectorTarget | undefined {
    const parsed = this.parseSingleSelector(selector);
    const attributes: Record<string, string> = {};
    const classes = new Set<string>();
    let tagName: string | undefined;
    let id: string | undefined;

    for (const node of parsed.nodes) {
      switch (node.type) {
        case 'tag': {
          if (node.namespace && node.namespace !== '*') return undefined;
          tagName = node.value.toLowerCase();
          break;
        }
        case 'id': {
          id = node.value;
          break;
        }
        case 'class': {
          classes.add(node.value);
          break;
        }
        case 'attribute': {
          const attributeName = node.attribute.toLowerCase();
          if (!node.operator) {
            attributes[attributeName] = '';
            break;
          }
          if (node.operator !== '=') return undefined;
          attributes[attributeName] = node.value ?? '';
          break;
        }
        case 'universal': {
          break;
        }
        default: {
          return undefined;
        }
      }
    }

    if (
      !tagName &&
      !id &&
      classes.size === 0 &&
      Object.keys(attributes).length === 0
    ) {
      return undefined;
    }

    if (id) {
      attributes.id = id;
    }

    if (classes.size > 0) {
      attributes.class = Array.from(classes).join(' ');
    }

    return {
      tagName,
      id,
      classes,
      attributes,
    };
  }

  protected compareAttributeValues(
    actualValue: string,
    expectedValue: string,
    insensitive: boolean | undefined,
    matcher: (left: string, right: string) => boolean
  ): boolean {
    if (!insensitive) {
      return matcher(actualValue, expectedValue);
    }

    return matcher(actualValue.toLowerCase(), expectedValue.toLowerCase());
  }

  protected matchesAttribute(
    node: selectorParser.Attribute,
    target: SelectorTarget
  ): boolean {
    const attributeName = node.attribute.toLowerCase();
    const actualValue = target.attributes[attributeName];

    if (actualValue === undefined) {
      return false;
    }

    if (!node.operator) {
      return true;
    }

    const expectedValue = node.value ?? '';

    switch (node.operator) {
      case '=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left === right
        );
      case '~=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left.split(/\s+/).includes(right)
        );
      case '|=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left === right || left.startsWith(`${right}-`)
        );
      case '^=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left.startsWith(right)
        );
      case '$=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left.endsWith(right)
        );
      case '*=':
        return this.compareAttributeValues(
          actualValue,
          expectedValue,
          node.insensitive,
          (left, right) => left.includes(right)
        );
      default:
        return false;
    }
  }

  protected matchesSelector(
    selector: selectorParser.Selector,
    target: SelectorTarget
  ): boolean {
    for (const node of selector.nodes) {
      switch (node.type) {
        case 'tag': {
          if (node.namespace && node.namespace !== '*') return false;
          if (target.tagName !== node.value.toLowerCase()) return false;
          break;
        }
        case 'id': {
          if (target.id !== node.value) return false;
          break;
        }
        case 'class': {
          if (!target.classes.has(node.value)) return false;
          break;
        }
        case 'attribute': {
          if (!this.matchesAttribute(node, target)) return false;
          break;
        }
        case 'universal': {
          break;
        }
        default: {
          return false;
        }
      }
    }

    return true;
  }

  protected cloneStatement(
    statement: StylesheetStatement
  ): StylesheetStatement {
    if (statement.kind === 'style') {
      return {
        kind: 'style',
        selectors: [...statement.selectors],
        declarations: { ...statement.declarations },
        declarationMeta: statement.declarationMeta
          ? { ...statement.declarationMeta }
          : undefined,
        children: statement.children
          ?.map((child) => this.cloneStatement(child))
          .filter((child) => child.kind === 'at-rule'),
      };
    }

    return {
      kind: 'at-rule',
      name: statement.name,
      prelude: statement.prelude,
      descriptors: statement.descriptors
        ? { ...statement.descriptors }
        : undefined,
      children: statement.children?.map((child) => this.cloneStatement(child)),
    };
  }

  protected normalizeStyleStatement(statement: StyleRule): StyleRule {
    const selectorSource = Array.isArray(statement.selectors)
      ? statement.selectors
      : [statement.selectors];

    const selectors = selectorSource.flatMap((selector) =>
      this.splitSelectorList(selector)
    );

    return {
      kind: 'style',
      selectors,
      declarations: { ...statement.declarations },
      declarationMeta: statement.declarationMeta
        ? { ...statement.declarationMeta }
        : undefined,
      children: statement.children
        ?.map((child) => this.normalizeAtRule(child))
        .filter((child) => child.kind === 'at-rule'),
    };
  }

  protected normalizeAtRule<Name extends string = string>(
    rule: AtRule<Name>
  ): AtRule<Name> {
    return {
      kind: 'at-rule',
      name: rule.name,
      prelude: rule.prelude,
      descriptors: rule.descriptors ? { ...rule.descriptors } : undefined,
      children: rule.children?.map((child) => this.cloneStatement(child)),
    };
  }

  protected resolveMatchingRules(
    targets: readonly SelectorTarget[]
  ): CompiledStyleRule[] {
    return this.compiledStyleRules
      .filter((rule) =>
        targets.some((target) => this.matchesSelector(rule.ast, target))
      )
      .sort((left, right) => {
        const specificityResult = Specificity.compare(
          left.specificity,
          right.specificity
        );

        if (specificityResult !== 0) {
          return specificityResult;
        }

        return left.order - right.order;
      });
  }

  protected mergeResolvedStyles(rules: readonly CompiledStyleRule[]): Styles {
    return rules.reduce<Styles>((resolved, rule) => {
      for (const [key, value] of Object.entries(rule.declarations)) {
        resolved[key as keyof Styles] = value;
      }

      return resolved;
    }, {});
  }

  protected shouldExcludeDeclarations(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _rule: CompiledStyleRule
  ): boolean {
    return false;
  }

  protected resolveStylesForTargets(
    targets: readonly SelectorTarget[]
  ): Styles {
    if (targets.length === 0) {
      return {};
    }

    const resolved: Styles = {};

    for (const rule of this.resolveMatchingRules(targets)) {
      if (this.shouldExcludeDeclarations(rule)) {
        for (const key of Object.keys(rule.declarations)) {
          delete resolved[key as keyof Styles];
        }

        continue;
      }

      for (const [key, value] of Object.entries(rule.declarations)) {
        resolved[key as keyof Styles] = value;
      }
    }

    return resolved;
  }
}

export function createStylesheet(
  statements: readonly StylesheetStatement[] = []
): IStylesheet {
  return new Stylesheet(statements);
}
