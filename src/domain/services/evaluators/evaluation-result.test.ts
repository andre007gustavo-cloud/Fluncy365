import { describe, expect, it } from "vitest";
import type { Exercise } from "../../entities/exercise";
import {
  buildResult,
  InvalidAnswerError,
  qualityFor,
  requireSpecAndAnswer,
} from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

const exercise: Exercise = {
  id: "ex-1",
  kind: "true_false",
  skill: "reading",
  difficulty: 1,
  prompt: { text: "The sky is blue.", instructionPt: "Verdadeiro ou falso?" },
  answerSpec: { mode: "truth", answer: true },
  srsItems: ["w1", "w2"],
};

describe("qualityFor", () => {
  it("da 5 ao acerto exato e 4 ao acerto com tolerancia", () => {
    expect(qualityFor(true, 1, false)).toBe(5);
    expect(qualityFor(true, 0.8, true)).toBe(4);
  });

  it("nunca passa de 2 em erro", () => {
    expect(qualityFor(false, 0.99, false)).toBe(2);
    expect(qualityFor(false, 0.5, false)).toBe(2);
    expect(qualityFor(false, 0.49, false)).toBe(1);
    expect(qualityFor(false, 0.01, false)).toBe(1);
    expect(qualityFor(false, 0, false)).toBe(0);
  });
});

describe("buildResult", () => {
  it("gera um sinal de SRS por item com a mesma qualidade", () => {
    const result = buildResult({ exercise, correct: true, score: 1, feedback: [] });
    expect(result.srsSignal).toEqual([
      { itemId: "w1", quality: 5 },
      { itemId: "w2", quality: 5 },
    ]);
    expect(result.errorCodes).toEqual([]);
    expect(result.correct).toBe(true);
  });

  it("limita o score entre 0 e 1", () => {
    expect(buildResult({ exercise, correct: false, score: -2, feedback: [] }).score).toBe(0);
    expect(buildResult({ exercise, correct: true, score: 3, feedback: [] }).score).toBe(1);
  });

  it("repassa feedback, errorCodes e tolerancia", () => {
    const feedback = [
      { excerpt: null, type: "content" as const, correction: null, explanationPt: "x" },
    ];
    const result = buildResult({
      exercise,
      correct: true,
      score: 0.8,
      feedback,
      errorCodes: ["gap_spelling"],
      tolerated: true,
    });
    expect(result.feedback).toBe(feedback);
    expect(result.errorCodes).toEqual(["gap_spelling"]);
    expect(result.srsSignal[0]?.quality).toBe(4);
  });

  it("nao gera sinais quando o exercicio nao tem itens de SRS", () => {
    const result = buildResult({
      exercise: { ...exercise, srsItems: [] },
      correct: false,
      score: 0,
      feedback: [],
    });
    expect(result.srsSignal).toEqual([]);
  });
});

describe("requireSpecAndAnswer", () => {
  it("devolve gabarito e resposta quando compativeis", () => {
    const { spec, answer } = requireSpecAndAnswer(
      exercise,
      { kind: "truth", value: false },
      "truth",
      "truth",
    );
    expect(spec.answer).toBe(true);
    expect(answer.value).toBe(false);
  });

  it("rejeita gabarito de outro modo", () => {
    expect(() =>
      requireSpecAndAnswer(exercise, { kind: "choice", index: 0 }, "choice", "choice"),
    ).toThrow(InvalidAnswerError);
  });

  it("rejeita resposta de outro tipo", () => {
    expect(() =>
      requireSpecAndAnswer(exercise, { kind: "text", value: "x" }, "truth", "truth"),
    ).toThrow(/esperada resposta "truth"/);
  });
});

describe("InvalidAnswerError", () => {
  it("e um Error com nome proprio", () => {
    const error = new InvalidAnswerError("falhou");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("InvalidAnswerError");
  });
});

describe("FEEDBACK_MESSAGES", () => {
  it("monta mensagens com os dados informados", () => {
    expect(FEEDBACK_MESSAGES.correctWithSpelling("because")).toContain("because");
    expect(FEEDBACK_MESSAGES.wrongAnswer("cat")).toContain("cat");
    expect(FEEDBACK_MESSAGES.wrongOption("b")).toContain("b");
    expect(FEEDBACK_MESSAGES.wrongTruth(true)).toContain("verdadeira");
    expect(FEEDBACK_MESSAGES.wrongTruth(false)).toContain("falsa");
    expect(FEEDBACK_MESSAGES.dictationMissingWord("a")).toContain("a");
    expect(FEEDBACK_MESSAGES.dictationExtraWord("b")).toContain("b");
    expect(FEEDBACK_MESSAGES.dictationWrongWord("c")).toContain("c");
    expect(FEEDBACK_MESSAGES.reorderWrongOrder("a b")).toContain("a b");
    expect(FEEDBACK_MESSAGES.matchWrongPair("x", "y")).toContain("y");
    expect(FEEDBACK_MESSAGES.correct).not.toBe("");
    expect(FEEDBACK_MESSAGES.emptyAnswer).not.toBe("");
  });
});
