import type {
  AnswerSpec,
  EvaluationResult,
  Exercise,
  FeedbackItem,
  SrsSignal,
  UserAnswer,
} from "../../entities/exercise";

export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerError";
  }
}

type Quality = SrsSignal["quality"];

/** D6: erro nunca chega a 3; acerto com tolerancia ortografica vale 4. */
export function qualityFor(correct: boolean, score: number, tolerated: boolean): Quality {
  if (correct) return tolerated ? 4 : 5;
  if (score >= 0.5) return 2;
  if (score > 0) return 1;
  return 0;
}

export interface BuildResultInput {
  readonly exercise: Exercise;
  readonly correct: boolean;
  readonly score: number;
  readonly feedback: readonly FeedbackItem[];
  readonly errorCodes?: readonly string[];
  readonly tolerated?: boolean;
}

export function buildResult(input: BuildResultInput): EvaluationResult {
  const score = Math.min(1, Math.max(0, input.score));
  const quality = qualityFor(input.correct, score, input.tolerated ?? false);
  return {
    correct: input.correct,
    score,
    feedback: input.feedback,
    srsSignal: input.exercise.srsItems.map((itemId) => ({ itemId, quality })),
    errorCodes: input.errorCodes ?? [],
  };
}

type SpecOf<M extends AnswerSpec["mode"]> = Extract<AnswerSpec, { mode: M }>;
type AnswerOf<K extends UserAnswer["kind"]> = Extract<UserAnswer, { kind: K }>;

/** D7: gabarito ou resposta de tipo errado e entrada malformada, nao resposta errada. */
export function requireSpecAndAnswer<M extends AnswerSpec["mode"], K extends UserAnswer["kind"]>(
  exercise: Exercise,
  answer: UserAnswer,
  mode: M,
  kind: K,
): { spec: SpecOf<M>; answer: AnswerOf<K> } {
  if (exercise.answerSpec.mode !== mode) {
    throw new InvalidAnswerError(
      `Exercício ${exercise.id}: esperado gabarito "${mode}", recebido "${exercise.answerSpec.mode}".`,
    );
  }
  if (answer.kind !== kind) {
    throw new InvalidAnswerError(
      `Exercício ${exercise.id}: esperada resposta "${kind}", recebida "${answer.kind}".`,
    );
  }
  return { spec: exercise.answerSpec as SpecOf<M>, answer: answer as AnswerOf<K> };
}
