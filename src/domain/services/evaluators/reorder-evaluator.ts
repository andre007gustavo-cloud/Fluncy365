import type { EvaluationResult, Exercise, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import {
  InvalidAnswerError,
  assertSupports,
  buildResult,
  praiseFeedback,
  requireSpecAndAnswer,
} from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { lcsLength } from "./word-diff";

const KIND: Exercise["kind"] = "reorder";

// Conta repetições: "the ... the" exige dois "the" na resposta.
function isPermutation(expected: readonly string[], given: readonly string[]): boolean {
  if (expected.length !== given.length) return false;
  const available = new Map<string, number>();
  for (const token of expected) available.set(token, (available.get(token) ?? 0) + 1);
  return given.every((token) => {
    const left = available.get(token) ?? 0;
    available.set(token, left - 1);
    return left > 0;
  });
}

export class ReorderEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    assertSupports(this, exercise);
    const { spec, answer: sequence } = requireSpecAndAnswer(
      exercise,
      answer,
      "sequence",
      "sequence",
    );
    const expected = spec.correctOrder;
    const given = sequence.order;
    if (!isPermutation(expected, given)) {
      throw new InvalidAnswerError(
        `Exercício ${exercise.id}: a resposta deve conter exatamente as mesmas peças do gabarito.`,
      );
    }

    const hits = lcsLength(expected, given);
    if (hits === expected.length) {
      return buildResult({
        exercise,
        correct: true,
        score: 1,
        feedback: praiseFeedback(),
      });
    }

    const correctSentence = expected.join(" ");
    return buildResult({
      exercise,
      correct: false,
      score: hits / expected.length,
      feedback: [
        {
          excerpt: given.join(" "),
          type: "grammar",
          correction: correctSentence,
          explanationPt: FEEDBACK_MESSAGES.reorderWrongOrder(correctSentence),
        },
      ],
      errorCodes: ["reorder_wrong_order"],
    });
  }
}
