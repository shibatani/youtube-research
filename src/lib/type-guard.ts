export const isNotNull = <T>(value: T): value is Exclude<T, null> => value !== null;

export const isNotUndefined = <T>(value: T): value is Exclude<T, undefined> => value !== undefined;

export const isNotNullish = <T>(value: T): value is Exclude<T, null | undefined> =>
  value !== null && value !== undefined;

/**
 * Type narrowing function for object property.
 * **Use alone** in a filter to narrow type while removing objects with null property values.
 */
export const isPropertyNotNullish = <T, K extends keyof T>(
  object: T,
  property: K,
): object is T & Record<K, NonNullable<T[K]>> =>
  object[property] !== null && object[property] !== undefined;

export const isObject = (x: unknown): x is object =>
  x !== null && (typeof x === "object" || typeof x === "function");

export const isKeyInObject = <T extends string>(
  obj: unknown,
  key: T,
): obj is { [key in T]: unknown } => isObject(obj) && key in obj;
