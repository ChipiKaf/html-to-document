// From https://github.com/bramus/specificity/blob/main/index.d.ts
// TODO: this file can be removed once https://github.com/bramus/specificity/issues/31 is implemented and released.

declare module '@bramus/specificity' {
  // Types & Classes
  export type SpecificityArray = [number, number, number];
  export type SpecificityObject = { a: number; b: number; c: number };

  export default class Specificity {
    static calculate(selector: string | CSSTreeAST): Array<Specificity>;
    static calculateForAST(selectorAST: CSSTreeAST): Specificity;
    static compare(
      s1: SpecificityInstanceOrObject,
      s2: SpecificityInstanceOrObject
    ): number;
    static equals(
      s1: SpecificityInstanceOrObject,
      s2: SpecificityInstanceOrObject
    ): boolean;
    static lessThan(
      s1: SpecificityInstanceOrObject,
      s2: SpecificityInstanceOrObject
    ): boolean;
    static greaterThan(
      s1: SpecificityInstanceOrObject,
      s2: SpecificityInstanceOrObject
    ): boolean;
    static min(
      ...specificities: SpecificityInstanceOrObject[]
    ): SpecificityInstanceOrObject;
    static max(
      ...specificities: SpecificityInstanceOrObject[]
    ): SpecificityInstanceOrObject;
    static sortAsc(
      ...specificities: SpecificityInstanceOrObject[]
    ): SpecificityInstanceOrObject;
    static sortDesc(
      ...specificities: SpecificityInstanceOrObject[]
    ): SpecificityInstanceOrObject;
    constructor(value: SpecificityObject, selector?: unknown);
    value: SpecificityObject;
    selector: string | CSSTreeAST;
    set a(arg: number);
    get a(): number;
    set b(arg: number);
    get b(): number;
    set c(arg: number);
    get c(): number;
    selectorString(): string;
    toObject(): SpecificityObject;
    toArray(): SpecificityArray;
    toString(): string;
    toJSON(): {
      selector: string;
      asObject: SpecificityObject;
      asArray: SpecificityArray;
      asString: string;
    };
    isEqualTo(otherSpecificity: SpecificityInstanceOrObject): boolean;
    isGreaterThan(otherSpecificity: SpecificityInstanceOrObject): boolean;
    isLessThan(otherSpecificity: SpecificityInstanceOrObject): boolean;
  }

  type SpecificityInstanceOrObject = Specificity | SpecificityObject;
  type CSSTreeAST = object; // @TODO: Define shape

  // CORE
  export function calculate(selector: string | CSSTreeAST): Array<Specificity>;
  export function calculateForAST(selectorAST: CSSTreeAST): Specificity;

  // UTIL: COMPARE
  export function equals(
    s1: SpecificityInstanceOrObject,
    s2: SpecificityInstanceOrObject
  ): boolean;
  export function greaterThan(
    s1: SpecificityInstanceOrObject,
    s2: SpecificityInstanceOrObject
  ): boolean;
  export function lessThan(
    s1: SpecificityInstanceOrObject,
    s2: SpecificityInstanceOrObject
  ): boolean;
  export function compare(
    s1: SpecificityInstanceOrObject,
    s2: SpecificityInstanceOrObject
  ): number;

  // UTIL: FILTER
  export function min(
    specificities: SpecificityInstanceOrObject[]
  ): SpecificityInstanceOrObject;
  export function max(
    specificities: SpecificityInstanceOrObject[]
  ): SpecificityInstanceOrObject;

  // UTIL: SORT
  export function sortAsc(
    specificities: SpecificityInstanceOrObject[]
  ): SpecificityInstanceOrObject[];
  export function sortDesc(
    specificities: SpecificityInstanceOrObject[]
  ): SpecificityInstanceOrObject[];
}
