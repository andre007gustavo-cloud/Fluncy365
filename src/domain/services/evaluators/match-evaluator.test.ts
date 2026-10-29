import { describe, expect, it } from "vitest";
import type { Exercise, UserAnswer } from "../../entities/exercise";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { MatchEvaluator } from "./match-evaluator";

const exercise: Exercise = {
  id: "ma-1",
  kind: "match",
  skill: "reading",
  difficulty: 1,
  prompt: { text: "", instructionPt: "Associe." },
  answerSpec: {
    mode: "pairs",
    pairs: [
      ["cat", "gato"],
      ["dog", "cachorro"],
      ["bird", "pássaro"],
      ["fish", "peixe"],
    ],
  },
  srsItems: ["v1", "v2"],
};

const pairs = (...items: [string, string][]): UserAnswer => ({ kind: "pairs", pairs: items });
const evaluator = new MatchEvaluator();

describe("MatchEvaluator", () => {
  it("suporta apenas match", () => {
    expect(evaluator.supports("match")).toBe(true);
    expect(evaluator.supports("reorder")).toBe(false);
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...exercise, kind: "reorder" };
    await expect(evaluator.evaluate(other, pairs())).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita gabarito ou resposta incompatíveis", async () => {
    const wrongSpec: Exercise = { ...exercise, answerSpec: { mode: "truth", answer: true } };
    await expect(evaluator.evaluate(wrongSpec, pairs())).rejects.toBeInstanceOf(InvalidAnswerError);
    await expect(evaluator.evaluate(exercise, { kind: "text", value: "x" })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("aceita todos os pares, em qualquer ordem", async () => {
    const result = await evaluator.evaluate(
      exercise,
      pairs(["fish", "peixe"], ["cat", "gato"], ["bird", "pássaro"], ["dog", "cachorro"]),
    );
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correct);
    expect(result.srsSignal).toEqual([
      { itemId: "v1", quality: 5 },
      { itemId: "v2", quality: 5 },
    ]);
  });

  it("dá nota parcial e um feedback por par errado", async () => {
    const result = await evaluator.evaluate(
      exercise,
      pairs(["cat", "gato"], ["dog", "peixe"], ["bird", "cachorro"], ["fish", "peixe"]),
    );
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.errorCodes).toEqual(["match_wrong_pair"]);
    expect(result.feedback).toEqual([
      {
        excerpt: "peixe",
        type: "vocabulary",
        correction: "cachorro",
        explanationPt: FEEDBACK_MESSAGES.matchWrongPair("dog", "cachorro"),
      },
      {
        excerpt: "cachorro",
        type: "vocabulary",
        correction: "pássaro",
        explanationPt: FEEDBACK_MESSAGES.matchWrongPair("bird", "pássaro"),
      },
    ]);
    expect(result.srsSignal[0]?.quality).toBe(2);
  });

  it("dá nota zero quando todos os pares estão errados", async () => {
    const result = await evaluator.evaluate(
      exercise,
      pairs(["cat", "x"], ["dog", "x"], ["bird", "x"], ["fish", "x"]),
    );
    expect(result.score).toBe(0);
    expect(result.feedback).toHaveLength(4);
    expect(result.srsSignal[0]?.quality).toBe(0);
  });

  it("conta pares ausentes como errados, sem trecho do aluno", async () => {
    const result = await evaluator.evaluate(exercise, pairs(["cat", "gato"]));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.25);
    expect(result.feedback).toHaveLength(3);
    expect(result.feedback.every((item) => item.excerpt === null)).toBe(true);
    expect(result.srsSignal[0]?.quality).toBe(1);
  });

  it("trata resposta sem pares como bem formada e errada", async () => {
    const result = await evaluator.evaluate(exercise, pairs());
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
  });

  it("rejeita item da esquerda inexistente no gabarito", async () => {
    await expect(evaluator.evaluate(exercise, pairs(["horse", "cavalo"]))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("rejeita item da esquerda repetido", async () => {
    await expect(
      evaluator.evaluate(exercise, pairs(["cat", "gato"], ["cat", "cachorro"])),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });
});
