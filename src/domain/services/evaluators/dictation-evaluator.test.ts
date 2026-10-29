import { describe, expect, it } from "vitest";
import type { AnswerSpec, Exercise, UserAnswer } from "../../entities/exercise";
import { DictationEvaluator } from "./dictation-evaluator";
import { InvalidAnswerError } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

type ExactSpec = Extract<AnswerSpec, { mode: "exact" }>;

function dictation(accepted: readonly string[], extra: Partial<ExactSpec> = {}): Exercise {
  return {
    id: "dict-1",
    kind: "dictation",
    skill: "listening",
    difficulty: 1,
    prompt: { text: "", instructionPt: "Escreva o que você ouvir." },
    answerSpec: { mode: "exact", accepted, caseSensitive: false, ...extra },
    srsItems: ["w1"],
  };
}

const text = (value: string): UserAnswer => ({ kind: "text", value });
const evaluator = new DictationEvaluator();
const sentence = dictation(["I like green tea"]);

describe("DictationEvaluator", () => {
  it("suporta apenas dictation", () => {
    expect(evaluator.supports("dictation")).toBe(true);
    expect(evaluator.supports("gap_fill")).toBe(false);
  });

  it("rejeita exercício de outro tipo", async () => {
    const other: Exercise = { ...sentence, kind: "gap_fill" };
    await expect(evaluator.evaluate(other, text("x"))).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  it("aceita frase idêntica", async () => {
    const result = await evaluator.evaluate(sentence, text("I like green tea"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.errorCodes).toEqual([]);
    expect(result.feedback[0]?.explanationPt).toBe(FEEDBACK_MESSAGES.correct);
    expect(result.srsSignal).toEqual([{ itemId: "w1", quality: 5 }]);
  });

  it("ignora pontuação e caixa", async () => {
    const result = await evaluator.evaluate(sentence, text("  i LIKE, green tea! "));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
  });

  it("aponta palavra faltando", async () => {
    const result = await evaluator.evaluate(sentence, text("I like tea"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.75);
    expect(result.errorCodes).toEqual(["dictation_missing_word"]);
    expect(result.feedback).toEqual([
      {
        excerpt: null,
        type: "content",
        correction: "green",
        explanationPt: FEEDBACK_MESSAGES.dictationMissingWord("green"),
      },
    ]);
  });

  it("aponta palavra sobrando", async () => {
    const result = await evaluator.evaluate(sentence, text("I really like green tea"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.8);
    expect(result.errorCodes).toEqual(["dictation_extra_word"]);
    expect(result.feedback[0]).toMatchObject({ excerpt: "really", correction: null });
  });

  it("aponta palavra trocada, sem tolerar erro de grafia", async () => {
    const result = await evaluator.evaluate(sentence, text("I like green tee"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0.75);
    expect(result.errorCodes).toEqual(["dictation_wrong_word"]);
    expect(result.feedback[0]).toMatchObject({
      excerpt: "tee",
      correction: "tea",
      explanationPt: FEEDBACK_MESSAGES.dictationWrongWord("tea"),
    });
  });

  it("penaliza ordem trocada", async () => {
    const result = await evaluator.evaluate(sentence, text("I green like tea"));
    expect(result.correct).toBe(false);
    expect(result.score).toBeLessThan(1);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("não repete códigos de erro", async () => {
    const result = await evaluator.evaluate(dictation(["a b c d"]), text("a x y d"));
    expect(result.errorCodes).toEqual(["dictation_wrong_word"]);
    expect(result.feedback).toHaveLength(2);
  });

  it("trata resposta vazia como errada", async () => {
    for (const value of ["", "  ", "..."]) {
      const result = await evaluator.evaluate(sentence, text(value));
      expect(result.correct).toBe(false);
      expect(result.score).toBe(0);
      expect(result.errorCodes).toEqual([]);
      expect(result.feedback[0]).toMatchObject({
        correction: "I like green tea",
        explanationPt: FEEDBACK_MESSAGES.emptyAnswer,
      });
    }
  });

  it("usa a variante aceita de maior score", async () => {
    const exercise = dictation(["I am happy", "I'm happy"]);
    const result = await evaluator.evaluate(exercise, text("I'm happy"));
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
  });

  it("mantém o apóstrofo interno como parte da palavra", async () => {
    const exercise = dictation(["I don't know"]);
    expect((await evaluator.evaluate(exercise, text("I don’t know"))).correct).toBe(true);
    const wrong = await evaluator.evaluate(exercise, text("I dont know"));
    expect(wrong.correct).toBe(false);
    expect(wrong.feedback[0]).toMatchObject({ excerpt: "dont", correction: "don't" });
  });

  it("dá score 0 quando a referência não tem palavras e há resposta", async () => {
    const result = await evaluator.evaluate(dictation(["..."]), text("hello"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
  });

  it("mantém a primeira variante em caso de empate e a melhor quando ela vem antes", async () => {
    const first = await evaluator.evaluate(dictation(["a b", "a c"]), text("a b"));
    expect(first.correct).toBe(true);
    const tie = await evaluator.evaluate(dictation(["a b", "a c"]), text("a x"));
    expect(tie.feedback[0]).toMatchObject({ correction: "b" });
  });

  it("trata referência e resposta sem palavras como resposta vazia", async () => {
    const result = await evaluator.evaluate(dictation(["..."]), text(""));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
  });

  it("rejeita gabarito sem variantes aceitas como conteúdo malformado", async () => {
    await expect(evaluator.evaluate(dictation([]), text("hello"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });

  it("ditado totalmente errado ainda mostra a correção", async () => {
    const result = await evaluator.evaluate(dictation(["tea"]), text("coffee"));
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.errorCodes).toEqual(["dictation_wrong_word"]);
    expect(result.feedback[0]).toMatchObject({ excerpt: "coffee", correction: "tea" });
  });

  it("rejeita resposta de tipo errado", async () => {
    await expect(evaluator.evaluate(sentence, { kind: "choice", index: 0 })).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
  });
});
