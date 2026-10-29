import { describe, expect, it } from "vitest";
import type { AnswerSpec, Exercise, ExerciseKind, UserAnswer } from "../../entities/exercise";
import { DETERMINISTIC_EVALUATORS } from "./index";

interface Case {
  readonly kind: ExerciseKind;
  readonly answerSpec: AnswerSpec;
  readonly right: UserAnswer;
  readonly wrong: UserAnswer;
}

const CASES: readonly Case[] = [
  {
    kind: "multiple_choice",
    answerSpec: { mode: "choice", options: ["is", "am", "are"], correctIndex: 1 },
    right: { kind: "choice", index: 1 },
    wrong: { kind: "choice", index: 2 },
  },
  {
    kind: "true_false",
    answerSpec: { mode: "truth", answer: false },
    right: { kind: "truth", value: false },
    wrong: { kind: "truth", value: true },
  },
  {
    kind: "gap_fill",
    answerSpec: { mode: "exact", accepted: ["went"], caseSensitive: false },
    right: { kind: "text", value: "went" },
    wrong: { kind: "text", value: "banana" },
  },
  {
    kind: "dictation",
    answerSpec: { mode: "exact", accepted: ["I like green tea"], caseSensitive: false },
    right: { kind: "text", value: "I like green tea" },
    wrong: { kind: "text", value: "completely different words here" },
  },
  {
    kind: "reorder",
    answerSpec: { mode: "sequence", correctOrder: ["I", "like", "tea"] },
    right: { kind: "sequence", order: ["I", "like", "tea"] },
    wrong: { kind: "sequence", order: ["tea", "like", "I"] },
  },
  {
    kind: "match",
    answerSpec: {
      mode: "pairs",
      pairs: [
        ["cat", "gato"],
        ["dog", "cachorro"],
      ],
    },
    right: {
      kind: "pairs",
      pairs: [
        ["cat", "gato"],
        ["dog", "cachorro"],
      ],
    },
    wrong: {
      kind: "pairs",
      pairs: [
        ["cat", "cachorro"],
        ["dog", "gato"],
      ],
    },
  },
];

const OPEN_KINDS: readonly ExerciseKind[] = ["open_writing", "translation", "read_aloud"];
const SRS_ITEMS = ["item-a", "item-b"];

function exerciseFor(testCase: Case): Exercise {
  return {
    id: `contract-${testCase.kind}`,
    kind: testCase.kind,
    skill: "reading",
    difficulty: 1,
    prompt: { text: "Prompt.", instructionPt: "Instrução." },
    answerSpec: testCase.answerSpec,
    srsItems: SRS_ITEMS,
  };
}

function evaluatorFor(kind: ExerciseKind) {
  return DETERMINISTIC_EVALUATORS.filter((e) => e.supports(kind));
}

describe("contrato comum dos avaliadores determinísticos", () => {
  it.each(CASES.map((c) => c.kind))("%s é suportado por exatamente um avaliador", (kind) => {
    expect(evaluatorFor(kind)).toHaveLength(1);
  });

  it.each(OPEN_KINDS)("%s não é suportado por nenhum avaliador determinístico", (kind) => {
    expect(evaluatorFor(kind)).toHaveLength(0);
  });

  describe.each(CASES)("$kind", (testCase) => {
    const exercise = exerciseFor(testCase);
    const evaluator = evaluatorFor(testCase.kind)[0]!;

    it("na resposta certa: correct, nota 1, sem códigos de erro", async () => {
      const result = await evaluator.evaluate(exercise, testCase.right);
      expect(result.correct).toBe(true);
      expect(result.score).toBe(1);
      expect(result.errorCodes).toEqual([]);
    });

    it("na resposta errada: incorrect, nota válida, com códigos de erro", async () => {
      const result = await evaluator.evaluate(exercise, testCase.wrong);
      expect(result.correct).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.errorCodes.length).toBeGreaterThan(0);
    });

    it.each([
      ["certa", testCase.right],
      ["errada", testCase.wrong],
    ] as const)("na resposta %s: um sinal SRS por item, com qualidade 0..5", async (_, answer) => {
      const result = await evaluator.evaluate(exercise, answer);
      expect(result.srsSignal.map((s) => s.itemId)).toEqual(SRS_ITEMS);
      for (const signal of result.srsSignal) {
        expect(Number.isInteger(signal.quality)).toBe(true);
        expect(signal.quality).toBeGreaterThanOrEqual(0);
        expect(signal.quality).toBeLessThanOrEqual(5);
        if (!result.correct) expect(signal.quality).toBeLessThan(3);
      }
    });
  });
});
