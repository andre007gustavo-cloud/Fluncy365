import type { EvaluationResult, Exercise, FeedbackItem, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import {
  InvalidAnswerError,
  assertSupports,
  buildResult,
  praiseFeedback,
  requireSpecAndAnswer,
} from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

const KIND: Exercise["kind"] = "match";

type Pairs = readonly (readonly [string, string])[];

// D7: item da esquerda fora do gabarito ou repetido é entrada malformada, não resposta errada.
// D7: gabarito vazio ou com lado esquerdo repetido é conteúdo malformado.
function indexKey(exercise: Exercise, pairs: Pairs): Map<string, string> {
  if (pairs.length === 0) {
    throw new InvalidAnswerError(`Exercício ${exercise.id}: o gabarito não tem pares.`);
  }
  const key = new Map<string, string>();
  for (const [left, right] of pairs) {
    if (key.has(left)) {
      throw new InvalidAnswerError(
        `Exercício ${exercise.id}: "${left}" aparece mais de uma vez no gabarito.`,
      );
    }
    key.set(left, right);
  }
  return key;
}

function indexByLeft(
  exercise: Exercise,
  key: ReadonlyMap<string, string>,
  given: Pairs,
): Map<string, string> {
  const byLeft = new Map<string, string>();
  for (const [left, right] of given) {
    if (!key.has(left)) {
      throw new InvalidAnswerError(
        `Exercício ${exercise.id}: "${left}" não faz parte dos itens do gabarito.`,
      );
    }
    if (byLeft.has(left)) {
      throw new InvalidAnswerError(`Exercício ${exercise.id}: "${left}" aparece mais de uma vez.`);
    }
    byLeft.set(left, right);
  }
  return byLeft;
}

export class MatchEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    assertSupports(this, exercise);
    const { spec, answer: pairs } = requireSpecAndAnswer(exercise, answer, "pairs", "pairs");
    const key = indexKey(exercise, spec.pairs);
    const byLeft = indexByLeft(exercise, key, pairs.pairs);

    const feedback: FeedbackItem[] = [];
    for (const [left, right] of key) {
      const given = byLeft.get(left);
      if (given === right) continue;
      feedback.push({
        excerpt: given ?? null,
        type: "vocabulary",
        correction: right,
        explanationPt: FEEDBACK_MESSAGES.matchWrongPair(left, right),
      });
    }

    if (feedback.length === 0) {
      return buildResult({
        exercise,
        correct: true,
        score: 1,
        feedback: praiseFeedback(),
      });
    }

    return buildResult({
      exercise,
      correct: false,
      score: (key.size - feedback.length) / key.size,
      feedback,
      errorCodes: ["match_wrong_pair"],
    });
  }
}
