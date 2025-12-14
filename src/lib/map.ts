export const groupByMap = <T, U>(array: T[], callbackFn: (value: T) => U): Map<U, T[]> => {
  const result = new Map<U, T[]>();

  for (const value of array) {
    const key = callbackFn(value);
    const values = result.get(key);

    // NOTE: We can implement this in one-line with the spread operator, but that is computationally expensive.
    if (values) {
      values.push(value);
    } else {
      result.set(key, [value]);
    }
  }

  return result;
};

/**
 * lodash の groupBy と同じ挙動だが、key の型が保持される
 * groupByMap の使用が推奨されるが、戻り値が Map だと不都合があるケースで使用する
 */
export const groupByObject = <T extends string | number, U>(
  array: U[],
  callbackFn: (value: U) => T,
): Record<T, U[]> => {
  const result = {} as Record<T, U[]>;

  for (const value of array) {
    const key = callbackFn(value);
    const values = result[key];

    // NOTE: We can implement this in one-line with the spread operator, but that is computationally expensive.
    if (values) {
      values.push(value);
    } else {
      result[key] = [value];
    }
  }

  return result;
};

export const keyByMap = <T, U extends PropertyKey>(
  array: T[],
  callbackFn: (value: T) => U,
): Map<U, T> => new Map(array.map((value) => [callbackFn(value), value]));

export const mapValues = <K, V, W>(
  map: Map<K, V>,
  fn: (value: V, key: K, map: Map<K, V>) => W,
): Map<K, W> => {
  const newMap = new Map<K, W>();

  for (const [key, value] of map.entries()) {
    newMap.set(key, fn(value, key, map));
  }

  return newMap;
};
