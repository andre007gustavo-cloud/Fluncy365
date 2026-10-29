import { describe, expect, it } from "vitest";
import type { EvaluationResult } from "./exercise";
import {
  countsForStreak,
  isPlanFullyAnswered,
  productionResults,
  type ActivityResult,
  type PlannedActivity,
  type SessionPlan,
  type StudySession,
} from "./session";

const activity = (id: string, over: Partial<PlannedActivity> = {}): PlannedActivity => ({
  id,
  block: "lesson",
  skill: "reading",
  exerciseId: `ex-${id}`,
  srsCardId: null,
  estimatedSeconds: 60,
  reason: "teste",
  ...over,
});

const plan = (activities: PlannedActivity[], isRescue = false): SessionPlan => ({
  day: "2025-03-10",
  userId: "u1",
  activities,
  estimatedMinutes: 20,
  isRescue,
});

const evaluation: EvaluationResult = {
  correct: true,
  score: 1,
  feedback: [],
  srsSignal: [],
  errorCodes: [],
};

const result = (activityId: string): ActivityResult => ({
  activityId,
  result: evaluation,
  secondsSpent: 30,
});

const session = (over: Partial<StudySession> = {}): StudySession => ({
  plan: plan([activity("a")]),
  results: [result("a")],
  xpEarned: 10,
  durationSec: 600,
  completed: true,
  ...over,
});

describe("isPlanFullyAnswered", () => {
  it("é true quando toda atividade tem resultado", () => {
    expect(
      isPlanFullyAnswered(plan([activity("a"), activity("b")]), [result("b"), result("a")]),
    ).toBe(true);
  });

  it("plano vazio nunca é completo", () => {
    expect(isPlanFullyAnswered(plan([]), [])).toBe(false);
  });

  it("é false se falta uma atividade", () => {
    expect(isPlanFullyAnswered(plan([activity("a"), activity("b")]), [result("a")])).toBe(false);
  });

  it("é false se um resultado aponta para atividade inexistente", () => {
    expect(isPlanFullyAnswered(plan([activity("a")]), [result("a"), result("zzz")])).toBe(false);
  });

  it("resultados duplicados não preenchem atividade faltante", () => {
    expect(
      isPlanFullyAnswered(plan([activity("a"), activity("b")]), [result("a"), result("a")]),
    ).toBe(false);
  });

  it("resultados duplicados com todas respondidas ainda é completo", () => {
    expect(isPlanFullyAnswered(plan([activity("a")]), [result("a"), result("a")])).toBe(true);
  });
});

describe("countsForStreak", () => {
  it("sessão normal concluída conta", () => {
    expect(countsForStreak(session())).toBe(true);
  });

  it("sessão de resgate concluída conta", () => {
    expect(countsForStreak(session({ plan: plan([activity("a")], true) }))).toBe(true);
  });

  it("sessão incompleta não conta", () => {
    expect(countsForStreak(session({ completed: false }))).toBe(false);
  });
});

describe("productionResults", () => {
  it("devolve só resultados de produção com exerciseId", () => {
    const s = session({
      plan: plan([
        activity("lesson1"),
        activity("prod1", { block: "production" }),
        activity("prod2", { block: "production", exerciseId: null }),
        activity("prod3", { block: "production" }),
      ]),
      results: [result("lesson1"), result("prod1"), result("prod2"), result("prod3")],
    });
    expect(productionResults(s).map((r) => r.activityId)).toEqual(["prod1", "prod3"]);
  });

  it("devolve vazio sem atividades de produção", () => {
    expect(productionResults(session())).toEqual([]);
  });
});
