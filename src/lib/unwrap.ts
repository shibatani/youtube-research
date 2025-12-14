import type { IfAny } from "./types";

class UnwrapError extends Error {
  constructor(public readonly reason: string) {
    super(`value is falsy though ${reason}`);
  }
}

/**
 * @param expectation "value is falsy though" に続ける形でここで unwrap を使える理由を書く
 *
 * TypeScript は非常に柔軟な型システムを持っているが JavaScript の try-catch の仕組み上、
 * エラーを throw してしまうと型の情報が失われてしまう。しかし Result 型などを用いることで
 * ある程度は型によって守られた状態で開発を行うことができる。
 *
 * このとき、ドメインロジックとして想定されている例外については型で表現することができるが、
 * 想定していないものやドメインロジック上発生してはいけないものまでは表現しきることが出来ない。
 * 仮にそれが出来たとしてもエラーのバリエーションが膨大になってしまう上に、ドメインロジックの
 * 本質的な部分の表現に対してノイズとなってしまう。こういったものについてはエラーを throw する
 * ことでイレギュラーなものとして扱いたい。（もちろん、トップレベルなどで catch をする前提であるが）
 *
 * その一例として、型としては `null | undefined` を含むがロジック上 null にも undefined に
 * なり得ないもののハンドリングがある。そのロジックが正しく実装されており周辺の処理も正常に機能
 * していれば null にも undefined になることがないときを考える。そういった場合でも対象となる値が
 * 配列に入っていたりすると TypeScript 上は `T | undefined` のような型になる。このとき
 * undefined のハンドリングを毎回していると本質的ではない例外が増えてしまい、実装の見通しの悪化につながる。
 *
 * この関数はそういったケースで型的に null や undefined を取り除きつつ、もし null や undefined
 * になってしまったときに備えて発生箇所を特定しやすくしたり、コードの意図の明確化を補助する役割を果たす。
 */
export const unwrap = <TValue>(
  value: TValue | null | undefined,
  expectation: IfAny<
    NoInfer<TValue>,
    "TValue must not be any or unknown. If value is really any or unknown, set TValue explicitly.",
    string
  >,
) => {
  if (value != null) {
    return value as IfAny<TValue, never, TValue>;
  }

  throw new UnwrapError(expectation);
};

unwrap.UnwrapError = UnwrapError;
