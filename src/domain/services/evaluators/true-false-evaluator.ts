import type { EvaluationResult, Exercise, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import {
  assertSupports,
  buildResult,
  praiseFeedback,
  requireSpecAndAnswer,
} from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";

const KIND: Exercise["kind"] = "true_false";

export class TrueFalseEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    assertSupports(this, exercise);
    const { spec, answer: truth } = requireSpecAndAnswer(exercise, answer, "truth", "truth");

    if (truth.value === spec.answer) {
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
      score: 0,
      feedback: [
        {
          excerpt: null,
          type: "content",
          correction: null,
          explanationPt: FEEDBACK_MESSAGES.wrongTruth(spec.answer),
        },
      ],
      errorCodes: ["tf_wrong"],
    });
  }
}
