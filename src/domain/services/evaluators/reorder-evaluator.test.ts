import { describe, expect, it } from "vitest";
import type { Exercise, UserAnswer } from "../../entities/exercise";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { ReorderEvaluator } from "./reorder-evaluator";

function reorder(correctOrder: readonly string[]): Exercise {
  return {
    id: "re-1",
    kind: "reorder",
    skill: "reading",
    difficulty: 1,
    prompt: { text: "", instructionPt: "Ordene as palavras." },
    answerSpec: { mode: "sequence", correctOrder },
    srsItems: ["g1"],
  };
}

const order = (...items: string[]): UserAnswer => ({ kind: "sequence", order: items });
const evaluator = new ReorderEvaluator();
const sentence = reorder(["I", "like", "green", "tea"]);

describe("ReorderEvaluator", () => {
  it("suporta apenas reorder", () => {
    expect(evaluator.supports("reorder")).toBe(true);
    expect(evaluator.supports("match")).toBe(false);
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...sentence, kind: "match" };
    await expect(evaluator.evaluate(other, order("a"))).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita gabarito ou resposta incompatíveis", async () => {
    const wrongSpec: Exercise = { ...sentence, answerSpec: { mode: "truth", answer: true } };
    await expect(evaluator.evaluate(wrongSpec, order("a"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
    await expect(evaluator.evaluate(sentence, { kind: "text", value: "x" })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("aceita a ordem exata", async () => {
    const result = await evaluator.evaluate(sentence, order("I", "like", "green", "tea"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correct);
    expect(result.srsSignal).toEqual([{ itemId: "g1", quality: 5 }]);
  });

  it("dá nota parcial pela maior subsequência comum", async () => {
    const result = await evaluator.evaluate(sentence, order("I", "green", "like", "tea"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.75);
    expect(result.errorCodes).toEqual(["reorder_wrong_order"]);
    expect(result.feedback).toEqual([
      {
        excerpt: "I green like tea",
        type: "grammar",
        correction: "I like green tea",
        explanationPt: FEEDBACK_MESSAGES.reorderWrongOrder("I like green tea"),
      },
    ]);
    expect(result.srsSignal).toEqual([{ itemId: "g1", quality: 2 }]);
  });

  it("dá nota baixa para ordem invertida", async () => {
    const result = await evaluator.evaluate(sentence, order("tea", "green", "like", "I"));
    expect(result.score).toBe(0.25);
    expect(result.srsSignal).toEqual([{ itemId: "g1", quality: 1 }]);
  });

  it("trata peças repetidas como multiconjunto", async () => {
    const twoThe = reorder(["the", "cat", "saw", "the", "dog"]);
    const ok = await evaluator.evaluate(twoThe, order("the", "cat", "saw", "the", "dog"));
    expect(ok.correct).toBe(true);
    const swapped = await evaluator.evaluate(twoThe, order("the", "dog", "saw", "the", "cat"));
    expect(swapped.correct).toBe(false);
    expect(swapped.score).toBe(0.6);
  });

  it("rejeita resposta que não é permutação", async () => {
    const invalid = [
      order(),
      order("I", "like", "green"),
      order("I", "like", "green", "tea", "now"),
      order("I", "like", "green", "coffee"),
      order("I", "I", "green", "tea"),
    ];
    for (const answer of invalid) {
      await expect(evaluator.evaluate(sentence, answer)).rejects.toBeInstanceOf(InvalidAnswerError);
    }
  });

  it("rejeita peça repetida além do que o gabarito tem", async () => {
    const twoThe = reorder(["the", "cat", "the", "dog"]);
    await expect(
      evaluator.evaluate(twoThe, order("the", "the", "the", "dog")),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("aceita sequência vazia contra gabarito vazio", async () => {
    const result = await evaluator.evaluate(reorder([]), order());
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
  });
});
