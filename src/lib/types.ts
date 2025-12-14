/**
 * 以下の特性を利用して any と unknown の場合の分岐を作成することができる
 * - `any extends T ? true : false` は `boolean` (`true | false`) になる (unknown も同様)
 * - `true extends boolean ? true : false` は `true` になる
 * - `true extends true ? true : false` は `true` になる
 * - `true extends false ? true : false` は `false` になる
 */
export type IfAny<T, TIfAny, TIfNotAny> = true extends IfAnyInner<T> ? TIfAny : TIfNotAny;
type IfAnyInner<T> = T extends T /** 1. 分配を有効にする */
  ? symbol extends T /** 2. symbol, {}, any, unknown のみが通過する */
    ? T extends symbol /** 3. symbol の場合に false になるようにする */
      ? false
      : T extends object /** 4. {} の場合に false になるようにする */
        ? false
        : true
    : false
  : never;

// type test0 = IfAny<any, true, false>;
// type test1 = IfAny<unknown, true, false>;
// type test2 = IfAny<never, true, false>;
// type test3 = IfAny<{}, true, false>;
// type test4 = IfAny<object, true, false>;
// type test5 = IfAny<symbol, true, false>;
// type test6 = IfAny<null, true, false>;
// type test7 = IfAny<undefined, true, false>;
// type test8 = IfAny<void, true, false>;
// type test9 = IfAny<boolean, true, false>;

/**
 * ref: https://stackoverflow.com/questions/54938141/typescript-convert-union-to-intersection#answer-54947677
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
