import { describe, expect, it } from "vitest";
import { createSrsCard, isDue, isMature, SRS_INITIAL_EASE, type SrsCard } from "./srs-card";

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

describe("createSrsCard", () => {
  const input = { id: "c2", front: "house", back: "casa", type: "word" as const };

  it("cria o cartao com o estado inicial", () => {
    expect(createSrsCard({ ...input, sourceLessonId: "l1" }, NOW)).toEqual({
      ...input,
      ease: SRS_INITIAL_EASE,
      intervalDays: 0,
      dueAt: NOW,
      lapses: 0,
      sourceLessonId: "l1",
    });
    expect(SRS_INITIAL_EASE).toBe(2.5);
  });

  it("define dueAt igual ao instante de criacao, sem compartilhar a instancia", () => {
    const created = createSrsCard(input, NOW);
    expect(created.dueAt.getTime()).toBe(NOW.getTime());
    expect(created.dueAt).not.toBe(NOW);
  });

  it("ja sai vencido", () => {
    expect(isDue(createSrsCard(input, NOW), NOW)).toBe(true);
  });

  it("converte sourceLessonId ausente em null", () => {
    expect(createSrsCard(input, NOW).sourceLessonId).toBeNull();
  });
});
