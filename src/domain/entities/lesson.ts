import type { CefrLevel } from "../value-objects/cefr-level";
import type { Exercise } from "./exercise";

export type LessonStatus = "seed" | "auto" | "approved";

export interface LessonBlock {
  readonly kind: "explanation" | "example" | "input_real" | "closing";
  readonly titlePt: string;
  readonly bodyPt: string;
  readonly examplesEn: readonly string[];
}

export interface Lesson {
  readonly id: string;
  readonly unitId: string;
  readonly dayIndex: number;
  readonly blocks: readonly LessonBlock[];
  readonly exercises: readonly Exercise[];
  readonly status: LessonStatus;
  readonly version: number;
}

export interface JwRef {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly type: "article" | "audio" | "video";
  readonly level: CefrLevel;
  readonly minutes: number;
  readonly topics: readonly string[];
}

/** Especificacao de uma unidade do syllabus (secao 12, content/units). */
export interface UnitSpec {
  readonly id: string;
  readonly month: number;
  readonly week: number;
  readonly level: CefrLevel;
  readonly grammarTopics: readonly string[];
  readonly vocabList: readonly string[];
  /** Erros tipicos de brasileiros a atacar nesta unidade (secao 2). */
  readonly ptErrorTargets: readonly string[];
  readonly jwRefs: readonly string[];
  readonly murphyRef: string | null;
  readonly masteryCriteria: { readonly minAccuracy: number; readonly minAttempts: number };
}
