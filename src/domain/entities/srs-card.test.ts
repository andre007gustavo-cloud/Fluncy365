import { describe, expect, it } from "vitest";
import { isDue, isMature, type SrsCard } from "./srs-card";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function card(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    id: "c1",
    front: "book",
    back: "livro",
    type: "word",
    ease: 2.5,
    intervalDays: 3,
    dueAt: new Date("2026-09-08T12:00:00.000Z"),
    lapses: 0,
    sourceLessonId: null,
    ...overrides,
  };
}

describe("isDue", () => {
  it("considera vencido no instante exato", () => {
    expect(isDue(card(), NOW)).toBe(true);
  });

  it("considera vencido o que passou da data", () => {
    expect(isDue(card({ dueAt: new Date("2026-09-01T00:00:00.000Z") }), NOW)).toBe(true);
  });

  it("nao considera vencido o que ainda vai vencer", () => {
    expect(isDue(card({ dueAt: new Date("2026-09-08T12:00:01.000Z") }), NOW)).toBe(false);
  });
});

describe("isMature", () => {
  it("madura a partir de 21 dias de intervalo", () => {
    expect(isMature(card({ intervalDays: 21 }))).toBe(true);
    expect(isMature(card({ intervalDays: 20 }))).toBe(false);
  });
});
