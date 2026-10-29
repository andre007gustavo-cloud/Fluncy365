import type { EvaluationResult, Exercise, FeedbackItem, UserAnswer } from "../../entities/exercise";
import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import { buildResult, InvalidAnswerError, requireSpecAndAnswer } from "./evaluation-result";
import { FEEDBACK_MESSAGES } from "./feedback-messages";
import { diffWords, type WordOp } from "./word-diff";

const KIND: Exercise["kind"] = "dictation";

interface Comparison {
  readonly ops: WordOp[];
  readonly score: number;
}

interface Problem {
  readonly code: string;
  readonly item: FeedbackItem;
}

function compare(reference: string, response: string): Comparison {
  const ops = diffWords(reference, response);
  const hits = ops.filter((op) => op.type === "equal").length;
  const referenceLength = ops.filter((op) => op.type !== "extra").length;
  const responseLength = ops.filter((op) => op.type !== "missing").length;
  // Resposta nao vazia garante denominador > 0; a vazia e tratada antes de usar o score.
  const longest = Math.max(referenceLength, responseLength);
  return { ops, score: longest === 0 ? 0 : hits / longest };
}

function bestComparison(accepted: readonly string[], response: string): Comparison {
  // O valor inicial evita erro quando nao ha variantes aceitas: a resposta fica toda "sobrando".
  return accepted
    .map((reference) => compare(reference, response))
    .reduce(
      (best, current) => (current.score > best.score ? current : best),
      compare("", response),
    );
}

function problemFor(op: WordOp): Problem | null {
  switch (op.type) {
    case "equal":
      return null;
    case "missing":
      return {
        code: "dictation_missing_word",
        item: {
          excerpt: null,
          type: "content",
          correction: op.expected,
          explanationPt: FEEDBACK_MESSAGES.dictationMissingWord(op.expected),
        },
      };
    case "extra":
      return {
        code: "dictation_extra_word",
        item: {
          excerpt: op.given,
          type: "content",
          correction: null,
          explanationPt: FEEDBACK_MESSAGES.dictationExtraWord(op.given),
        },
      };
    case "wrong":
      return {
        code: "dictation_wrong_word",
        item: {
          excerpt: op.given,
          type: "content",
          correction: op.expected,
          explanationPt: FEEDBACK_MESSAGES.dictationWrongWord(op.expected),
        },
      };
  }
}

export class DictationEvaluator implements ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean {
    return kind === KIND;
  }

  async evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult> {
    if (!this.supports(exercise.kind)) {
      throw new InvalidAnswerError(`Tipo de exercício não suportado: "${exercise.kind}".`);
    }
    const { spec, answer: text } = requireSpecAndAnswer(exercise, answer, "exact", "text");

    const { ops, score } = bestComparison(spec.accepted, text.value);
    const hasWords = ops.some((op) => op.type !== "missing");
    if (!hasWords) {
      return buildResult({
        exercise,
        correct: false,
        score: 0,
        feedback: [
          {
            excerpt: null,
            type: "content",
            correction: spec.accepted[0] ?? "",
            explanationPt: FEEDBACK_MESSAGES.emptyAnswer,
          },
        ],
      });
    }

    const problems = ops.flatMap((op) => problemFor(op) ?? []);
    if (problems.length === 0) {
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
      score,
      feedback: problems.map(({ item }) => item),
      errorCodes: [...new Set(problems.map(({ code }) => code))],
    });
  }
}
