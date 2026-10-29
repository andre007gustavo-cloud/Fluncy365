import { describe, expect, it } from "vitest";
import type { Exercise } from "../../entities/exercise";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { MultipleChoiceEvaluator } from "./multiple-choice-evaluator";

const exercise: Exercise = {
  id: "mc-1",
  kind: "multiple_choice",
  skill: "reading",
  difficulty: 1,
  prompt: { text: "Choose: I ___ a student.", instructionPt: "Escolha a opção correta." },
  answerSpec: { mode: "choice", options: ["is", "am", "are"], correctIndex: 1 },
  srsItems: ["w1", "w2"],
};

const evaluator = new MultipleChoiceEvaluator();

describe("MultipleChoiceEvaluator", () => {
  it("suporta apenas multiple_choice", () => {
    expect(evaluator.supports("multiple_choice")).toBe(true);
    expect(evaluator.supports("true_false")).toBe(false);
    expect(evaluator.supports("gap_fill")).toBe(false);
  });

  it("avalia o acerto com nota máxima e qualidade 5", async () => {
    const result = await evaluator.evaluate(exercise, { kind: "choice", index: 1 });
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correct);
    expect(result.srsSignal).toEqual([
      { itemId: "w1", quality: 5 },
      { itemId: "w2", quality: 5 },
    ]);
  });

  it("avalia o erro com a opção correta no feedback e qualidade 0", async () => {
    const result = await evaluator.evaluate(exercise, { kind: "choice", index: 2 });
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errorCodes).toEqual(["mc_wrong_option"]);
    expect(result.feedback).toEqual([
      {
        excerpt: "are",
        type: "content",
        correction: "am",
        explanationPt: FEEDBACK_MESSAGES.wrongOption("am"),
      },
    ]);
    expect(result.srsSignal.every((s) => s.quality === 0)).toBe(true);
  });

  it.each([-1, 3, 1.5, Number.NaN])("rejeita o índice inválido %s", async (index) => {
    await expect(evaluator.evaluate(exercise, { kind: "choice", index })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("rejeita gabarito com correctIndex fora das opções", async () => {
    const broken: Exercise = {
      ...exercise,
      answerSpec: { mode: "choice", options: ["is", "am"], correctIndex: 5 },
    };
    await expect(evaluator.evaluate(broken, { kind: "choice", index: 0 })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("rejeita resposta de tipo incompatível", async () => {
    await expect(
      evaluator.evaluate(exercise, { kind: "truth", value: true }),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita gabarito incompatível", async () => {
    const wrongSpec: Exercise = { ...exercise, answerSpec: { mode: "truth", answer: true } };
    await expect(
      evaluator.evaluate(wrongSpec, { kind: "choice", index: 0 }),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...exercise, kind: "true_false" };
    await expect(evaluator.evaluate(other, { kind: "choice", index: 1 })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });
});
