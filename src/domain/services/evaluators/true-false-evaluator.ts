import type { EvaluationResult, Exercise, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import { buildResult, InvalidAnswerError, requireSpecAndAnswer } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

const KIND: Exercise["kind"] = "true_false";

export class TrueFalseEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    if (!this.supports(exercise.kind)) {
      throw new InvalidAnswerError(`Tipo de exercício não suportado: "${exercise.kind}".`);
    }
    const { spec, answer: truth } = requireSpecAndAnswer(exercise, answer, "truth", "truth");

    if (truth.value === spec.answer) {
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
      score: 0,
      feedback: [
        {
          excerpt: null,
          type: "content",
          correction: spec.answer ? "true" : "false",
          explanationPt: FEEDBACK_MESSAGES.wrongTruth(spec.answer),
        },
      ],
      errorCodes: ["tf_wrong"],
    });
  }
}
