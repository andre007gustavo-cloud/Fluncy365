import type { EvaluationResult, Exercise, FeedbackItem, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import { buildResult, InvalidAnswerError, requireSpecAndAnswer } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

const KIND: Exercise["kind"] = "match";

type Pairs = readonly (readonly [string, string])[];

// D7: item da esquerda fora do gabarito ou repetido é entrada malformada, não resposta errada.
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
    if (!this.supports(exercise.kind)) {
      throw new InvalidAnswerError(`Tipo de exercício não suportado: "${exercise.kind}".`);
    }
    const { spec, answer: pairs } = requireSpecAndAnswer(exercise, answer, "pairs", "pairs");
    const key = new Map(spec.pairs);
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
        feedback: [
          {
            excerpt: null,
            type: "praise",
            correction: null,
            explanationPt: FEEDBACK_MESSAGES.correct,
          },
        ],
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
