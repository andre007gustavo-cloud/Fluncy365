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

/**
 * Plano vazio nunca e completo: uma sessao sem atividades nao pode contar como estudo.
 * Resultados duplicados para a mesma atividade contam uma vez so; ids fora do plano invalidam.
 */
export function isPlanFullyAnswered(
  plan: SessionPlan,
  results: readonly ActivityResult[],
): boolean {
  if (plan.activities.length === 0) return false;
  const planned = new Set(plan.activities.map((activity) => activity.id));
  const answered = new Set(results.map((item) => item.activityId));
  for (const id of answered) {
    if (!planned.has(id)) return false;
  }
  return answered.size === planned.size;
}

/** Sessao de resgate concluida mantem o streak, igual a sessao normal. */
export function countsForStreak(session: StudySession): boolean {
  return session.completed;
}

export function productionResults(session: StudySession): readonly ActivityResult[] {
  const productionIds = new Set(
    session.plan.activities
      .filter((activity) => activity.block === "production" && activity.exerciseId !== null)
      .map((activity) => activity.id),
  );
  return session.results.filter((item) => productionIds.has(item.activityId));
}
