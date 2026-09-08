import type { EvaluationResult, Exercise, UserAnswer } from "../entities/exercise";

/**
 * Principio L: avaliadores deterministicos e por IA sao intercambiaveis.
 * Quem chama nunca sabe qual dos dois esta rodando.
 */
export interface ExerciseEvaluator {
  supports(kind: Exercise["kind"]): boolean;
  evaluate(exercise: Exercise, answer: UserAnswer): Promise<EvaluationResult>;
}
