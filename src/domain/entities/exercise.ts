import type { Difficulty } from "../value-objects/difficulty";
import type { Skill } from "../value-objects/skill";

export type ExerciseKind =
  | "multiple_choice"
  | "gap_fill"
  | "reorder"
  | "match"
  | "dictation"
  | "true_false"
  | "open_writing"
  | "translation"
  | "read_aloud";

export interface ExercisePrompt {
  readonly text: string;
  readonly instructionPt: string;
  readonly audioUrl?: string;
  readonly jwRefId?: string;
}

/** Gabarito dos exercicios deterministicos ou rubrica dos abertos. */
export type AnswerSpec =
  | {
      readonly mode: "exact";
      readonly accepted: readonly string[];
      readonly caseSensitive: boolean;
    }
  | { readonly mode: "choice"; readonly options: readonly string[]; readonly correctIndex: number }
  | { readonly mode: "sequence"; readonly correctOrder: readonly string[] }
  | { readonly mode: "pairs"; readonly pairs: readonly (readonly [string, string])[] }
  | { readonly mode: "rubric"; readonly criteria: readonly string[]; readonly minWords: number };

export interface Exercise {
  readonly id: string;
  readonly kind: ExerciseKind;
  readonly skill: Skill;
  readonly difficulty: Difficulty;
  readonly prompt: ExercisePrompt;
  readonly answerSpec: AnswerSpec;
  /** Ids de itens do SRS que este exercicio reforca. */
  readonly srsItems: readonly string[];
}

export type UserAnswer =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "choice"; readonly index: number }
  | { readonly kind: "sequence"; readonly order: readonly string[] }
  | { readonly kind: "pairs"; readonly pairs: readonly (readonly [string, string])[] }
  | { readonly kind: "audio"; readonly transcript: string; readonly blobRef?: string };

export interface FeedbackItem {
  readonly excerpt: string | null;
  readonly type: "grammar" | "vocabulary" | "spelling" | "pronunciation" | "content" | "praise";
  readonly correction: string | null;
  /** Explicacao curta em pt-BR (1-2 frases). */
  readonly explanationPt: string;
}

export interface SrsSignal {
  readonly itemId: string;
  readonly quality: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface EvaluationResult {
  /** null = avaliacao qualitativa (exercicios abertos, corrigidos por IA). */
  readonly correct: boolean | null;
  /** 0..1 */
  readonly score: number;
  readonly feedback: readonly FeedbackItem[];
  readonly srsSignal: readonly SrsSignal[];
  /** Codigos que alimentam o errorLog, ex.: "aux_do_missing". */
  readonly errorCodes: readonly string[];
}
