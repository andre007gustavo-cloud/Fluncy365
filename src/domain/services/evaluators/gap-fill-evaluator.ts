import type { EvaluationResult, Exercise, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import {
  assertSupports,
  buildResult,
  praiseFeedback,
  requireAccepted,
  requireSpecAndAnswer,
} from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { levenshtein, normalizeText } from "./normalize-text";

const KIND: Exercise["kind"] = "gap_fill";
const SPELLING_MIN_LETTERS = 5;
const SPELLING_SCORE = 0.8;

type Match = "exact" | "spelling" | "none";

interface Variant {
  readonly original: string;
  readonly normalized: string;
}

interface Outcome {
  readonly match: Match;
  readonly variant: Variant;
}

const isSingleWord = (text: string): boolean => text !== "" && !/\s/.test(text);

// Tolerância desligada com caseSensitive: senão "paris" vs "Paris" anularia a exigência de caixa.
// Levenshtein <= 1 pode aceitar palavras reais vizinhas (where/there): dívida conhecida,
// mitigada pelo wordBank, que também desliga a tolerância.
function matchAgainst(answer: string, expected: string, allowTolerance: boolean): Match {
  if (answer === expected) return "exact";
  const tolerable =
    allowTolerance &&
    isSingleWord(answer) &&
    isSingleWord(expected) &&
    expected.length >= SPELLING_MIN_LETTERS;
  return tolerable && levenshtein(answer, expected) <= 1 ? "spelling" : "none";
}

function bestMatch(
  answer: string,
  variants: readonly [Variant, ...Variant[]],
  allowTolerance: boolean,
): Outcome {
  const outcomes = variants.map((variant) => ({
    match: matchAgainst(answer, variant.normalized, allowTolerance),
    variant,
  }));
  return (
    outcomes.find(({ match }) => match === "exact") ??
    outcomes.find(({ match }) => match === "spelling") ?? { match: "none", variant: variants[0] }
  );
}

export class GapFillEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    assertSupports(this, exercise);
    const { spec, answer: text } = requireSpecAndAnswer(exercise, answer, "exact", "text");
    const options = { caseSensitive: spec.caseSensitive };
    const given = normalizeText(text.value, options);
    const accepted = requireAccepted(exercise, spec.accepted);
    const toVariant = (original: string): Variant => ({
      original,
      normalized: normalizeText(original, options),
    });
    const variants: readonly [Variant, ...Variant[]] = [
      toVariant(accepted[0]),
      ...accepted.slice(1).map(toVariant),
    ];
    const expectedDisplay = variants[0].original;

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
    const { match, variant } = bestMatch(given, variants, allowTolerance);

    if (match === "exact") {
      return buildResult({
        exercise,
        correct: true,
        score: 1,
        feedback: praiseFeedback(),
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
            correction: variant.original,
            explanationPt: FEEDBACK_MESSAGES.correctWithSpelling(variant.original),
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
