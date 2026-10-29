import type { ExerciseEvaluator } from "../../ports/exercise-evaluator.port";
import { DictationEvaluator } from "./dictation-evaluator";
import { GapFillEvaluator } from "./gap-fill-evaluator";
import { MatchEvaluator } from "./match-evaluator";
import { MultipleChoiceEvaluator } from "./multiple-choice-evaluator";
import { ReorderEvaluator } from "./reorder-evaluator";
import { TrueFalseEvaluator } from "./true-false-evaluator";

export { DictationEvaluator } from "./dictation-evaluator";
export { InvalidAnswerError } from "./evaluation-result";
export { GapFillEvaluator } from "./gap-fill-evaluator";
export { MatchEvaluator } from "./match-evaluator";
export { MultipleChoiceEvaluator } from "./multiple-choice-evaluator";
export { ReorderEvaluator } from "./reorder-evaluator";
export { TrueFalseEvaluator } from "./true-false-evaluator";
export { diffWords } from "./word-diff";
export type { WordOp } from "./word-diff";

export const DETERMINISTIC_EVALUATORS: readonly ExerciseEvaluator[] = [
  new MultipleChoiceEvaluator(),
  new TrueFalseEvaluator(),
  new GapFillEvaluator(),
  new DictationEvaluator(),
  new ReorderEvaluator(),
  new MatchEvaluator(),
];
