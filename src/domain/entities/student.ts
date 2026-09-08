import type { CefrLevel } from "../value-objects/cefr-level";
import type { Skill } from "../value-objects/skill";

export type LevelsBySkill = Readonly<Record<Skill, CefrLevel>>;

export type TopicStatus = "locked" | "learning" | "review" | "mastered";

export interface TopicMastery {
  readonly topicId: string;
  readonly accuracy: number;
  readonly attempts: number;
  readonly sessions: number;
  readonly lastSeen: Date | null;
  readonly status: TopicStatus;
}

export interface StudentError {
  readonly code: string;
  readonly example: string;
  readonly count: number;
  readonly lastAt: Date;
  readonly skill: Skill;
}

export interface StudentPace {
  readonly avgSecondsPerExercise: number;
  readonly sessionCompletionRate: number;
  readonly usualHour: number | null;
}

export interface StudentModel {
  readonly userId: string;
  readonly levels: LevelsBySkill;
  readonly vocabSize: number;
  readonly pace: StudentPace;
  readonly updatedAt: Date;
}

/** Recorte compacto do aluno enviado a IA (secao 9.1) - sem dados pessoais. */
export interface StudentSnapshot {
  readonly nickname: string;
  readonly levels: LevelsBySkill;
  readonly vocabSize: number;
  readonly recentErrorCodes: readonly string[];
  readonly weakItems: readonly string[];
  readonly masteredTopics: readonly string[];
}
