import type { EvaluationResult, Exercise, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import { buildResult, InvalidAnswerError, requireSpecAndAnswer } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { levenshtein, normalizeText } from "./normalize-text";

const KIND: Exercise["kind"] = "gap_fill";
const SPELLING_MIN_LETTERS = 5;
const SPELLING_SCORE = 0.8;

type Match = "exact" | "spelling" | "none";

function matchAgainst(answer: string, expected: string, allowTolerance: boolean): Match {
  if (answer === expected) return "exact";
  const tolerable = allowTolerance && expected.length >= SPELLING_MIN_LETTERS;
  return tolerable && levenshtein(answer, expected) <= 1 ? "spelling" : "none";
}

function bestMatch(answer: string, accepted: readonly string[], allowTolerance: boolean): Match {
  const matches = accepted.map((expected) => matchAgainst(answer, expected, allowTolerance));
  if (matches.includes("exact")) return "exact";
  return matches.includes("spelling") ? "spelling" : "none";
}

export class GapFillEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    if (!this.supports(exercise.kind)) {
      throw new InvalidAnswerError(`Tipo de exercício não suportado: "${exercise.kind}".`);
    }
    const { spec, answer: text } = requireSpecAndAnswer(exercise, answer, "exact", "text");
    const options = { caseSensitive: spec.caseSensitive };
    const given = normalizeText(text.value, options);
    const accepted = spec.accepted.map((candidate) => normalizeText(candidate, options));
    const expectedDisplay = spec.accepted[0] ?? "";

    if (given === "") {
      return buildResult({
        exercise,
        correct: false,
        score: 0,
        feedback: [
          {
            excerpt: null,
            type: "content",
            correction: expectedDisplay,
            explanationPt: FEEDBACK_MESSAGES.emptyAnswer,
          },
        ],
      });
    }

    // Com banco ou caixa exigida, errar a grafia/caixa é errar; tolerância só na digitação livre.
    const allowTolerance = spec.wordBank === undefined && !spec.caseSensitive;
    const match = bestMatch(given, accepted, allowTolerance);

    if (match === "exact") {
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

    if (match === "spelling") {
      return buildResult({
        exercise,
        correct: true,
        score: SPELLING_SCORE,
        tolerated: true,
        feedback: [
          {
            excerpt: text.value,
            type: "spelling",
            correction: expectedDisplay,
            explanationPt: FEEDBACK_MESSAGES.correctWithSpelling(expectedDisplay),
          },
        ],
        errorCodes: ["gap_spelling"],
      });
    }

    return buildResult({
      exercise,
      correct: false,
      score: 0,
      feedback: [
        {
          excerpt: text.value,
          type: "content",
          correction: expectedDisplay,
          explanationPt: FEEDBACK_MESSAGES.wrongAnswer(expectedDisplay),
        },
      ],
      errorCodes: ["gap_wrong_answer"],
    });
  }
}
