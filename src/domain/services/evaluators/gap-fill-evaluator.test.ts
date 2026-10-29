import { describe, expect, it } from "vitest";
import type { AnswerSpec, Exercise, UserAnswer } from "../../entities/exercise";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { GapFillEvaluator } from "./gap-fill-evaluator";

type ExactSpec = Extract<AnswerSpec, { mode: "exact" }>;

function gap(accepted: readonly string[], extra: Partial<ExactSpec> = {}): Exercise {
  return {
    id: "gap-1",
    kind: "gap_fill",
    skill: "writing",
    difficulty: 1,
    prompt: { text: "Complete.", instructionPt: "Complete a lacuna." },
    answerSpec: { mode: "exact", accepted, caseSensitive: false, ...extra },
    srsItems: ["w1"],
  };
}

const text = (value: string): UserAnswer => ({ kind: "text", value });
const evaluator = new GapFillEvaluator();

describe("GapFillEvaluator", () => {
  it("suporta apenas gap_fill", () => {
    expect(evaluator.supports("gap_fill")).toBe(true);
    expect(evaluator.supports("dictation")).toBe(false);
  });

  it("avalia o acerto exato com qualidade 5", async () => {
    const result = await evaluator.evaluate(gap(["went"]), text("went"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correct);
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 5 }]);
  });

  it("ignora caixa quando caseSensitive é false", async () => {
    const result = await evaluator.evaluate(gap(["Paris"]), text("pARIS"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
  });

  it("respeita a caixa quando caseSensitive é true", async () => {
    const exercise = gap(["Paris"], { caseSensitive: true });
    expect((await evaluator.evaluate(exercise, text("Paris"))).correct).toBe(true);
    const wrong = await evaluator.evaluate(exercise, text("paris"));
    expect(wrong.correct).toBe(false);
  });

  it("ignora acentos, espaços extras e pontuação final", async () => {
    expect((await evaluator.evaluate(gap(["cafe"]), text("  café.  "))).score).toBe(1);
    expect((await evaluator.evaluate(gap(["I am"]), text("I   am!"))).score).toBe(1);
  });

  it("aceita apóstrofo curvo", async () => {
    const result = await evaluator.evaluate(gap(["don't"]), text("don’t"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
  });

  it("não expande contrações: don't é diferente de do not", async () => {
    const result = await evaluator.evaluate(gap(["don't"]), text("do not"));
    expect(result.correct).toBe(false);
  });

  it("aceita qualquer uma das respostas aceitas", async () => {
    const exercise = gap(["color", "colour"]);
    expect((await evaluator.evaluate(exercise, text("colour"))).score).toBe(1);
    expect((await evaluator.evaluate(exercise, text("color"))).score).toBe(1);
  });

  it("prefere o acerto exato à tolerância entre várias aceitas", async () => {
    const result = await evaluator.evaluate(gap(["colour", "colous"]), text("colous"));
    expect(result.score).toBe(1);
  });

  it("tolera um erro de grafia em palavra longa", async () => {
    const result = await evaluator.evaluate(gap(["library"]), text("libary"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(0.8);
    expect(result.errorCodes).toEqual(["gap_spelling"]);
    expect(result.feedback).toEqual([
      {
        excerpt: "libary",
        type: "spelling",
        correction: "library",
        explanationPt: FEEDBACK_MESSAGES.correctWithSpelling("library"),
      },
    ]);
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 4 }]);
  });

  it("tolera no limite de 5 letras", async () => {
    expect((await evaluator.evaluate(gap(["house"]), text("hous"))).correct).toBe(true);
  });

  it("não tolera dois erros de grafia", async () => {
    const result = await evaluator.evaluate(gap(["library"]), text("libray5"));
    expect(result.correct).toBe(false);
  });

  it("não tolera erro em palavras curtas: in e on são diferentes", async () => {
    const result = await evaluator.evaluate(gap(["in"]), text("on"));
    expect(result.correct).toBe(false);
    expect((await evaluator.evaluate(gap(["love"]), text("live"))).correct).toBe(false);
  });

  it("não tem tolerância quando há banco de palavras", async () => {
    const exercise = gap(["library"], { wordBank: ["library", "libary"] });
    const result = await evaluator.evaluate(exercise, text("libary"));
    expect(result.correct).toBe(false);
    expect((await evaluator.evaluate(exercise, text("library"))).score).toBe(1);
  });

  it("avalia o erro com a resposta correta no feedback e qualidade 0", async () => {
    const result = await evaluator.evaluate(gap(["went", "gone"]), text("goed"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errorCodes).toEqual(["gap_wrong_answer"]);
    expect(result.feedback).toEqual([
      {
        excerpt: "goed",
        type: "content",
        correction: "went",
        explanationPt: FEEDBACK_MESSAGES.wrongAnswer("went"),
      },
    ]);
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 0 }]);
  });

  it.each(["", "   ", "..."])("trata resposta vazia %j como errada, sem exceção", async (value) => {
    const result = await evaluator.evaluate(gap(["went"]), text(value));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.emptyAnswer);
    expect(result.feedback[0]?.correction).toBe("went");
  });

  it("rejeita gabarito sem respostas aceitas como conteúdo malformado", async () => {
    await expect(evaluator.evaluate(gap([]), text("went"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("não tolera erro em resposta de várias palavras", async () => {
    const result = await evaluator.evaluate(gap(["we do"]), text("we go"));
    expect(result.correct).toBe(false);
  });

  it("mostra no feedback de grafia a variante que casou", async () => {
    const result = await evaluator.evaluate(gap(["library", "museum"]), text("musem"));
    expect(result.correct).toBe(true);
    expect(result.feedback[0]).toMatchObject({ type: "spelling", correction: "museum" });
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correctWithSpelling("museum"));
  });

  it("rejeita resposta de tipo incompatível", async () => {
    await expect(
      evaluator.evaluate(gap(["went"]), { kind: "choice", index: 0 }),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("rejeita gabarito incompatível", async () => {
    const wrongSpec: Exercise = { ...gap(["went"]), answerSpec: { mode: "truth", answer: true } };
    await expect(evaluator.evaluate(wrongSpec, text("went"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...gap(["went"]), kind: "dictation" };
    await expect(evaluator.evaluate(other, text("went"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });
});
