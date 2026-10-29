import { clampDifficulty, type Difficulty } from "../value-objects/difficulty";
import { xp, type Xp } from "../value-objects/xp";
import { productionResults, type StudySession } from "../entities/session";

export const SESSION_COMPLETE_XP = 100;
export const IMMERSION_DAILY_CAP_XP = 50;

export interface DailyXpInput {
  readonly session: StudySession;
  readonly difficultyByExerciseId: ReadonlyMap<string, Difficulty>;
  /** Exercicios ja concluidos em dias anteriores. */
  readonly completedBeforeToday: ReadonlySet<string>;
  /** Exercicios com revisao vencida no SRS hoje: pontuam de novo. */
  readonly scheduledReviewIds: ReadonlySet<string>;
  readonly immersionXp: number;
}

export interface DailyXpBreakdown {
  readonly sessionComplete: Xp;
  readonly productionBonus: Xp;
  readonly immersion: Xp;
  readonly total: Xp;
}

/** 2 x dificuldade (1-10) x nota (0-1): de 0 a 20 por exercicio. */
export function productionBonus(difficulty: Difficulty, score: number): Xp {
  assertFinite(score, "score");
  const clampedScore = Math.min(1, Math.max(0, score));
  return xp(2 * clampDifficulty(difficulty) * clampedScore);
}

export function computeDailyXp(input: DailyXpInput): DailyXpBreakdown {
  const sessionComplete = sessionCompleteXp(input.session);
  const bonus = productionBonusTotal(input);
  const immersion = immersionDailyXp(input.immersionXp);
  return {
    sessionComplete,
    productionBonus: bonus,
    immersion,
    total: xp(sessionComplete + bonus + immersion),
  };
}

// Sessao de resgate so mantem o streak; nao rende XP de sessao.
function sessionCompleteXp(session: StudySession): Xp {
  return session.completed && !session.plan.isRescue ? xp(SESSION_COMPLETE_XP) : xp(0);
}

// NaN indica erro de calculo a montante; falha alto em vez de esconder com 0.
function immersionDailyXp(value: number): Xp {
  assertFinite(value, "immersionXp");
  return xp(Math.min(IMMERSION_DAILY_CAP_XP, value));
}

function productionBonusTotal(input: DailyXpInput): Xp {
  const exerciseIdByActivity = new Map(
    input.session.plan.activities.map((activity) => [activity.id, activity.exerciseId]),
  );
  const seen = new Set<string>();
  let total = 0;
  for (const item of productionResults(input.session)) {
    const exerciseId = exerciseIdByActivity.get(item.activityId);
    if (!exerciseId || seen.has(exerciseId)) continue;
    seen.add(exerciseId);
    if (input.completedBeforeToday.has(exerciseId) && !input.scheduledReviewIds.has(exerciseId)) {
      continue;
    }
    const difficulty = input.difficultyByExerciseId.get(exerciseId);
    if (difficulty === undefined) {
      throw new Error(`Dificuldade ausente para o exercicio de producao "${exerciseId}".`);
    }
    total += productionBonus(difficulty, item.result.score);
  }
  return xp(total);
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} invalido: ${value}`);
}
