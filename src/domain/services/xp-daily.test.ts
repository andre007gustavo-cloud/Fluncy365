import { describe, expect, it } from "vitest";
import type {
  ActivityResult,
  PlannedActivity,
  SessionBlockKind,
  StudySession,
} from "../entities/session";
import {
  computeDailyXp,
  IMMERSION_DAILY_CAP_XP,
  productionBonus,
  SESSION_COMPLETE_XP,
  type DailyXpInput,
} from "./xp-daily";

const activity = (
  id: string,
  block: SessionBlockKind,
  exerciseId = `ex-${id}`,
): PlannedActivity => ({
  id,
  block,
  skill: "speaking",
  exerciseId,
  srsCardId: null,
  estimatedSeconds: 60,
  reason: "teste",
});

const answer = (activityId: string, score = 1): ActivityResult => ({
  activityId,
  result: { correct: true, score, feedback: [], srsSignal: [], errorCodes: [] },
  secondsSpent: 30,
});

interface Over {
  activities?: PlannedActivity[];
  results?: ActivityResult[];
  completed?: boolean;
  isRescue?: boolean;
}

const session = ({
  activities = [activity("l1", "lesson")],
  results = [answer("l1")],
  completed = true,
  isRescue = false,
}: Over = {}): StudySession => ({
  plan: { day: "2025-03-10", userId: "u1", activities, estimatedMinutes: 20, isRescue },
  results,
  xpEarned: 0,
  durationSec: 600,
  completed,
});

const input = (over: Partial<DailyXpInput> = {}): DailyXpInput => ({
  session: session(),
  difficultyByExerciseId: new Map(),
  completedBeforeToday: new Set(),
  scheduledReviewIds: new Set(),
  immersionXp: 0,
  ...over,
});

const productionSession = (score = 1, completed = true): StudySession =>
  session({
    activities: [activity("p1", "production")],
    results: [answer("p1", score)],
    completed,
  });

const diff = (d: number) => new Map([["ex-p1", d]]);

describe("XP de sessão", () => {
  it("sessão completa normal dá 100", () => {
    const out = computeDailyXp(input());
    expect(out.sessionComplete).toBe(SESSION_COMPLETE_XP);
    expect(out.total).toBe(100);
  });

  it("sessão incompleta dá 0", () => {
    const out = computeDailyXp(input({ session: session({ completed: false }) }));
    expect(out.sessionComplete).toBe(0);
  });

  it("resgate concluído não dá os 100", () => {
    const out = computeDailyXp(input({ session: session({ isRescue: true }) }));
    expect(out.sessionComplete).toBe(0);
  });
});

describe("bônus de produção", () => {
  it("cresce com a dificuldade e é 0 com nota 0", () => {
    expect(productionBonus(1, 1)).toBe(2);
    expect(productionBonus(10, 1)).toBe(20);
    expect(productionBonus(10, 0)).toBe(0);
  });

  it("tem teto de 20 mesmo com entradas fora da escala", () => {
    expect(productionBonus(99, 5)).toBe(20);
    expect(productionBonus(5, -1)).toBe(0);
  });

  it("score inválido lança", () => {
    expect(() => productionBonus(5, Number.NaN)).toThrow();
  });

  it("ignora exercícios fora do bloco production", () => {
    expect(computeDailyXp(input()).productionBonus).toBe(0);
  });

  it("conta o bônus mesmo com sessão incompleta ou de resgate (o planejamento não condiciona)", () => {
    const base = { difficultyByExerciseId: diff(5) };
    const incomplete = computeDailyXp(input({ ...base, session: productionSession(1, false) }));
    expect(incomplete).toMatchObject({ sessionComplete: 0, productionBonus: 10 });
    const rescue = session({
      activities: [activity("p1", "production")],
      results: [answer("p1")],
      isRescue: true,
    });
    expect(computeDailyXp(input({ ...base, session: rescue })).productionBonus).toBe(10);
  });

  it("sem dificuldade no mapa lança", () => {
    expect(() => computeDailyXp(input({ session: productionSession() }))).toThrow(/ex-p1/);
  });
});

describe("anti-farm", () => {
  const base = () => input({ session: productionSession(), difficultyByExerciseId: diff(10) });

  it("primeira conclusão pontua", () => {
    expect(computeDailyXp(base()).productionBonus).toBe(20);
  });

  it("exercício já concluído antes de hoje não pontua", () => {
    const out = computeDailyXp({ ...base(), completedBeforeToday: new Set(["ex-p1"]) });
    expect(out.productionBonus).toBe(0);
  });

  it("exercício concluído antes mas com revisão agendada pontua", () => {
    const out = computeDailyXp({
      ...base(),
      completedBeforeToday: new Set(["ex-p1"]),
      scheduledReviewIds: new Set(["ex-p1"]),
    });
    expect(out.productionBonus).toBe(20);
  });

  it("mesmo exercício duas vezes na sessão pontua uma vez", () => {
    const repeated = session({
      activities: [activity("p1", "production", "ex-p1"), activity("p2", "production", "ex-p1")],
      results: [answer("p1"), answer("p2")],
    });
    const out = computeDailyXp({ ...base(), session: repeated });
    expect(out.productionBonus).toBe(20);
  });

  it("é idempotente", () => {
    const data = base();
    expect(computeDailyXp(data)).toEqual(computeDailyXp(data));
  });
});

describe("imersão", () => {
  it.each([
    [30, 30],
    [80, IMMERSION_DAILY_CAP_XP],
    [-5, 0],
    [12.4, 12],
  ])("%d vira %d", (value, expected) => {
    expect(computeDailyXp(input({ immersionXp: value })).immersion).toBe(expected);
  });

  it("NaN e infinito lançam", () => {
    expect(() => computeDailyXp(input({ immersionXp: Number.NaN }))).toThrow();
    expect(() => computeDailyXp(input({ immersionXp: Infinity }))).toThrow();
  });
});

describe("total", () => {
  it("é a soma, inteira e não negativa", () => {
    const out = computeDailyXp(
      input({
        session: productionSession(0.33),
        difficultyByExerciseId: diff(7),
        immersionXp: 80,
      }),
    );
    expect(out.total).toBe(out.sessionComplete + out.productionBonus + out.immersion);
    for (const value of Object.values(out)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});
