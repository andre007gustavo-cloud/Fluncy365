import { describe, expectTypeOf, it } from "vitest";
import type { AnswerSpec, UserAnswer } from "./exercise";

type SpecOf<M extends AnswerSpec["mode"]> = Extract<AnswerSpec, { mode: M }>;
type AnswerOf<K extends UserAnswer["kind"]> = Extract<UserAnswer, { kind: K }>;

describe("contrato de exercicio", () => {
  it("AnswerSpec aceita o modo truth com resposta booleana", () => {
    expectTypeOf<SpecOf<"truth">>().toEqualTypeOf<{
      readonly mode: "truth";
      readonly answer: boolean;
    }>();
  });

  it("modo exact tem wordBank opcional e somente leitura", () => {
    expectTypeOf<SpecOf<"exact">["wordBank"]>().toEqualTypeOf<readonly string[] | undefined>();
    expectTypeOf<{
      mode: "exact";
      accepted: string[];
      caseSensitive: boolean;
    }>().toExtend<AnswerSpec>();
  });

  it("UserAnswer aceita o kind truth com valor booleano", () => {
    expectTypeOf<AnswerOf<"truth">>().toEqualTypeOf<{
      readonly kind: "truth";
      readonly value: boolean;
    }>();
  });
});
