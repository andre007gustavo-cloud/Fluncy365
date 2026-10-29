import { describe, expect, it } from "vitest";
import type { Exercise } from "../../entities/exercise";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { TrueFalseEvaluator } from "./true-false-evaluator";

const exercise: Exercise = {
  id: "tf-1",
  kind: "true_false",
  skill: "reading",
  difficulty: 1,
  prompt: { text: "The sky is green.", instructionPt: "Verdadeiro ou falso?" },
  answerSpec: { mode: "truth", answer: false },
  srsItems: ["w1"],
};

const evaluator = new TrueFalseEvaluator();

describe("TrueFalseEvaluator", () => {
  it("suporta apenas true_false", () => {
    expect(evaluator.supports("true_false")).toBe(true);
    expect(evaluator.supports("multiple_choice")).toBe(false);
  });

  it("avalia o acerto com qualidade 5", async () => {
    const result = await evaluator.evaluate(exercise, { kind: "truth", value: false });
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 5 }]);
  });

  it("avalia o erro quando o gabarito é falso", async () => {
    const result = await evaluator.evaluate(exercise, { kind: "truth", value: true });
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errorCodes).toEqual(["tf_wrong"]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.wrongTruth(false));
    expect(result.feedback[0]?.correction).toBeNull();
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 0 }]);
  });

  it("avalia o erro quando o gabarito é verdadeiro", async () => {
    const trueExercise: Exercise = { ...exercise, answerSpec: { mode: "truth", answer: true } };
    const result = await evaluator.evaluate(trueExercise, { kind: "truth", value: false });
    expect(result.correct).toBe(false);
    expect(result.feedback[0]?.correction).toBeNull();
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.wrongTruth(true));
  });

  it("rejeita resposta de tipo incompatível", async () => {
    await expect(evaluator.evaluate(exercise, { kind: "choice", index: 0 })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("rejeita gabarito incompatível", async () => {
    const wrongSpec: Exercise = {
      ...exercise,
      answerSpec: { mode: "choice", options: ["a", "b"], correctIndex: 0 },
    };
    await expect(
      evaluator.evaluate(wrongSpec, { kind: "truth", value: true }),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...exercise, kind: "multiple_choice" };
    await expect(evaluator.evaluate(other, { kind: "truth", value: true })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });
});
