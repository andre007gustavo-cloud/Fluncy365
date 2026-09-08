import type { Skill } from "../value-objects/skill";
import type { Xp } from "../value-objects/xp";
import type { EvaluationResult } from "./exercise";

export type SessionBlockKind = "srs_warmup" | "lesson" | "input_real" | "production" | "closing";

export interface PlannedActivity {
  readonly id: string;
  readonly block: SessionBlockKind;
  readonly skill: Skill;
  readonly exerciseId: string | null;
  readonly srsCardId: string | null;
  readonly estimatedSeconds: number;
  /** Por que o planner escolheu esta atividade - auditavel (secao 8.5). */
  readonly reason: string;
}

export interface SessionPlan {
  /** Dia no formato YYYY-MM-DD, no fuso do aluno. */
  readonly day: string;
  readonly userId: string;
  readonly activities: readonly PlannedActivity[];
  readonly estimatedMinutes: number;
  readonly isRescue: boolean;
}

export interface ActivityResult {
  readonly activityId: string;
  readonly result: EvaluationResult;
  readonly secondsSpent: number;
}

export interface StudySession {
  readonly plan: SessionPlan;
  readonly results: readonly ActivityResult[];
  readonly xpEarned: Xp;
  readonly durationSec: number;
  readonly completed: boolean;
}
