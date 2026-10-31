import { describe, expect, it } from "vitest";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentModel } from "@/domain/entities/student";
import { MONTHLY_SHIELDS } from "@/domain/entities/streak";
import {
  FixedClock,
  InMemorySrsCardRepository,
  InMemoryStreakRepository,
  InMemoryStudentModelRepository,
} from "@/infrastructure/fakes/in-memory-repositories";
import { GetTodayOverview } from "./get-today-overview";

const USER = "user-1";
const COURSE = "en";

function card(id: string, dueAt: string): SrsCard {
  return {
    id,
    front: id,
    back: id,
    type: "word",
    ease: 2.5,
    intervalDays: 3,
    dueAt: new Date(dueAt),
    lapses: 0,
    sourceLessonId: null,
  };
}

function model(): StudentModel {
  return {
    userId: USER,
    levels: { reading: 2.4, listening: 2.0, writing: 1.8, speaking: 1.5 },
    vocabSize: 1900,
    pace: { avgSecondsPerExercise: 18, sessionCompletionRate: 0.9, usualHour: 20 },
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  };
}

function build(cards: readonly SrsCard[], withModel: boolean) {
  const clock = new FixedClock(new Date("2026-09-08T12:00:00.000Z"));
  const useCase = new GetTodayOverview({
    clock,
    srsCards: new InMemorySrsCardRepository({ [COURSE]: { [USER]: cards } }),
    streaks: new InMemoryStreakRepository(),
    studentModels: new InMemoryStudentModelRepository(
      withModel ? { [COURSE]: { [USER]: model() } } : {},
    ),
  });
  return { useCase, clock };
}

describe("GetTodayOverview", () => {
  it("conta apenas os cartoes vencidos", async () => {
    const { useCase } = build(
      [
        card("a", "2026-09-07T00:00:00.000Z"),
        card("b", "2026-09-08T00:00:00.000Z"),
        card("c", "2026-09-20T00:00:00.000Z"),
      ],
      true,
    );

    const overview = await useCase.execute(USER, COURSE);

    expect(overview.dueToday).toBe(2);
    expect(overview.extraQueue).toBe(0);
    expect(overview.day).toBe("2026-09-08");
  });

  it("manda o excedente do teto diario para a fila extra", async () => {
    const cards = Array.from({ length: 26 }, (_, i) =>
      card(`c${String(i).padStart(2, "0")}`, "2026-09-01T00:00:00.000Z"),
    );
    const { useCase } = build(cards, true);

    const overview = await useCase.execute(USER, COURSE);

    expect(overview.dueToday).toBe(20);
    expect(overview.extraQueue).toBe(6);
  });

  it("funciona para aluno novo, sem modelo salvo", async () => {
    const { useCase } = build([], false);

    const overview = await useCase.execute(USER, COURSE);

    expect(overview.levels).toBeNull();
    expect(overview.vocabSize).toBe(0);
    expect(overview.streak.shieldsLeft).toBe(MONTHLY_SHIELDS);
  });

  it("avancar o relogio faz cartoes futuros vencerem", async () => {
    const { useCase, clock } = build([card("a", "2026-09-15T00:00:00.000Z")], true);

    expect((await useCase.execute(USER, COURSE)).dueToday).toBe(0);
    clock.advanceDays(10);
    expect((await useCase.execute(USER, COURSE)).dueToday).toBe(1);
  });

  it("le somente os dados do curso informado", async () => {
    const { useCase } = build([card("a", "2026-09-07T00:00:00.000Z")], true);

    const overview = await useCase.execute(USER, "vmw");

    expect(overview.dueToday).toBe(0);
    expect(overview.levels).toBeNull();
    expect(overview.vocabSize).toBe(0);
  });
});
