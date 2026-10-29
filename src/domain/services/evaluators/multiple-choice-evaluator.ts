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

const KIND: Exercise["kind"] = "multiple_choice";

function optionAt(exercise: Exercise, options: readonly string[], index: number): string {
  const option = Number.isInteger(index) ? options[index] : undefined;
  if (option === undefined) {
    throw new InvalidAnswerError(
      `Exercício ${exercise.id}: opção ${index} fora do intervalo 0..${options.length - 1}.`,
    );
  }
  return option;
}

export class MultipleChoiceEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    assertSupports(this, exercise);
    const { spec, answer: choice } = requireSpecAndAnswer(exercise, answer, "choice", "choice");
    const { index } = choice;
    const chosen = optionAt(exercise, spec.options, index);
    const expected = optionAt(exercise, spec.options, spec.correctIndex);

    if (index === spec.correctIndex) {
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
          excerpt: chosen,
          type: "content",
          correction: expected,
          explanationPt: FEEDBACK_MESSAGES.wrongOption(expected),
        },
      ],
      errorCodes: ["mc_wrong_option"],
    });
  }
}
