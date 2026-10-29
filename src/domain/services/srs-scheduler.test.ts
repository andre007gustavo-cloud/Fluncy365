import { describe, expect, it } from "vitest";
import {
  SRS_MIN_EASE,
  createSrsCard,
  type ReviewQuality,
  type SrsCard,
} from "../entities/srs-card";
import { FixedClock } from "../../infrastructure/fakes/in-memory-repositories";
import { DAILY_REVIEW_LIMIT, Sm2SrsScheduler, nextEase, nextInterval } from "./srs-scheduler";
import { selectDueCards } from "./select-due-cards";

describe("nextEase", () => {
  it.each([
    [5, 2.6],
    [4, 2.5],
    [3, 2.36],
    [2, 2.18],
    [1, 1.96],
    [0, 1.7],
  ] as [ReviewQuality, number][])("qualidade %i a partir de 2,5 resulta em %f", (q, expected) => {
    expect(nextEase(2.5, q)).toBe(expected);
  });

  it("respeita o piso", () => {
    expect(nextEase(1.3, 0)).toBe(SRS_MIN_EASE);
    expect(nextEase(1.4, 2)).toBe(SRS_MIN_EASE);
  });

  it("nao acumula erro de ponto flutuante apos varias respostas", () => {
    let ease = 2.5;
    for (let i = 0; i < 10; i++) ease = nextEase(ease, 3);
    expect(ease).toBe(1.3);
    ease = 2.5;
    for (let i = 0; i < 3; i++) ease = nextEase(ease, 3);
    expect(ease).toBe(2.08);
    expect(nextEase(ease, 5)).toBe(2.18);
  });
});

describe("nextInterval", () => {
  it("sobe a escada 0 -> 1 -> 3 -> 7 -> 18 -> 45 com qualidade 4", () => {
    const steps: number[] = [];
    let interval = 0;
    for (let i = 0; i < 5; i++) {
      interval = nextInterval(interval, nextEase(2.5, 4));
      steps.push(interval);
    }
    expect(steps).toEqual([1, 3, 7, 18, 45]);
  });

  it("respeita os limiares da escada", () => {
    expect(nextInterval(2, 2.5)).toBe(3);
    expect(nextInterval(5, 2.5)).toBe(7);
    expect(nextInterval(0, 2.5)).toBe(1);
    expect(nextInterval(1, 2.5)).toBe(3);
    expect(nextInterval(3, 2.5)).toBe(7);
    expect(nextInterval(6, 2.5)).toBe(7);
  });

  it("multiplica pelo ease ja atualizado e arredonda", () => {
    expect(nextInterval(7, nextEase(2.5, 3))).toBe(17);
    expect(nextInterval(7, 1.3)).toBe(9);
  });
});

describe("Sm2SrsScheduler.review", () => {
  const scheduler = new Sm2SrsScheduler();
  const NOW = new Date("2026-09-08T12:00:00.000Z");
  const DAY = 86_400_000;

  function card(overrides: Partial<SrsCard> = {}): SrsCard {
    return {
      id: "c1",
      front: "book",
      back: "livro",
      type: "word",
      ease: 2.5,
      intervalDays: 0,
      dueAt: NOW,
      lapses: 0,
      sourceLessonId: "l1",
      ...overrides,
    };
  }

  it("acerto agenda exatamente N dias depois da revisao", () => {
    const result = scheduler.review(card({ intervalDays: 7 }), 4, NOW);
    expect(result.intervalDays).toBe(18);
    expect(result.dueAt.getTime()).toBe(NOW.getTime() + 18 * DAY);
    expect(result.lapses).toBe(0);
    expect(result.ease).toBe(2.5);
  });

  it("preserva os demais campos do cartao", () => {
    const result = scheduler.review(card(), 5, NOW);
    expect(result).toMatchObject({
      id: "c1",
      front: "book",
      back: "livro",
      type: "word",
      sourceLessonId: "l1",
    });
  });

  it.each([0, 1, 2] as ReviewQuality[])(
    "qualidade %i em cartao maduro e lapso: volta a 1 dia",
    (quality) => {
      const mature = card({ intervalDays: 45, lapses: 2 });
      const result = scheduler.review(mature, quality, NOW);
      expect(result.intervalDays).toBe(1);
      expect(result.lapses).toBe(3);
      expect(result.ease).toBe(nextEase(2.5, quality));
      expect(result.ease).toBeLessThan(2.5);
      expect(result.dueAt.getTime()).toBe(NOW.getTime() + DAY);
    },
  );

  it("qualidade 3 e acerto, nao lapso", () => {
    const result = scheduler.review(card({ intervalDays: 7 }), 3, NOW);
    expect(result.lapses).toBe(0);
    expect(result.intervalDays).toBe(17);
    expect(result.ease).toBe(2.36);
  });

  it("recupera depois do lapso: 1 -> 3 -> 7", () => {
    let current = scheduler.review(card({ intervalDays: 45 }), 0, NOW);
    const steps = [current.intervalDays];
    for (let i = 0; i < 2; i++) {
      current = scheduler.review(current, 4, current.dueAt);
      steps.push(current.intervalDays);
    }
    expect(steps).toEqual([1, 3, 7]);
    expect(current.lapses).toBe(1);
  });

  it("lapsos seguidos ficam em 1 dia e acumulam, com ease no piso", () => {
    let current = card({ intervalDays: 10 });
    for (let i = 0; i < 4; i++) current = scheduler.review(current, 1, NOW);
    expect(current.intervalDays).toBe(1);
    expect(current.lapses).toBe(4);
    expect(current.ease).toBe(SRS_MIN_EASE);
  });

  it.each([
    ["virada de ano", "2026-12-31T10:00:00.000Z", 0, "2027-01-01T10:00:00.000Z"],
    ["ano bissexto", "2028-02-28T10:00:00.000Z", 0, "2028-02-29T10:00:00.000Z"],
    ["fim de fevereiro", "2026-01-31T10:00:00.000Z", 16, "2026-03-01T10:00:00.000Z"],
  ])("%s", (_name, reviewedAt, intervalDays, expectedDue) => {
    const input = card({ intervalDays, ease: intervalDays === 16 ? 1.8 : 2.5 });
    const result = scheduler.review(input, 4, new Date(reviewedAt));
    expect(result.dueAt.toISOString()).toBe(expectedDue);
  });

  it("revisao atrasada usa o intervalo guardado, nao o tempo decorrido", () => {
    const late = new Date(NOW.getTime() + 30 * DAY);
    const result = scheduler.review(card({ intervalDays: 7, dueAt: NOW }), 4, late);
    expect(result.intervalDays).toBe(18);
    expect(result.dueAt.getTime()).toBe(late.getTime() + 18 * DAY);
  });

  it("nao altera o cartao de entrada", () => {
    const input = Object.freeze(card({ intervalDays: 7 }));
    const snapshot = structuredClone(input);
    const result = scheduler.review(input, 0, NOW);
    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
  });
});

describe("Sm2SrsScheduler.dueCards", () => {
  it("repassa para a selecao de vencidos respeitando o teto", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    const base = { front: "a", back: "b", type: "word", ease: 2.5, intervalDays: 1, lapses: 0 };
    const cards = [
      { ...base, id: "late", dueAt: new Date("2026-09-01T00:00:00.000Z"), sourceLessonId: null },
      { ...base, id: "future", dueAt: new Date("2026-10-01T00:00:00.000Z"), sourceLessonId: null },
    ] as SrsCard[];
    expect(new Sm2SrsScheduler().dueCards(cards, now, 5).map((c) => c.id)).toEqual(["late"]);
  });
});

describe("Sm2SrsScheduler com relogio simulado", () => {
  const scheduler = new Sm2SrsScheduler();
  const START = new Date("2026-09-08T12:00:00.000Z");

  it("cartao sempre acertado aparece nos dias 0, 1, 4, 11 e 29; lapso reinicia a sequencia", () => {
    const clock = new FixedClock(START);
    let cards: SrsCard[] = [
      createSrsCard({ id: "steady", front: "a", back: "b", type: "word" }, clock.now()),
      createSrsCard({ id: "lapsed", front: "c", back: "d", type: "word" }, clock.now()),
    ];
    const seen: Record<string, number[]> = { steady: [], lapsed: [] };

    for (let day = 0; day < 60; day++) {
      const selected = scheduler.dueCards(cards, clock.now(), DAILY_REVIEW_LIMIT);
      const reviewed = new Map(
        selected.map((c) => {
          seen[c.id]!.push(day);
          const quality: ReviewQuality = c.id === "lapsed" && day === 4 ? 0 : 4;
          return [c.id, scheduler.review(c, quality, clock.now())] as const;
        }),
      );
      cards = cards.map((c) => reviewed.get(c.id) ?? c);
      clock.advanceDays(1);
    }

    expect(seen.steady).toEqual([0, 1, 4, 11, 29]);
    expect(seen.lapsed).toEqual([0, 1, 4, 5, 8, 15, 27, 47]);
  });

  it("respeita o teto diario: 20 mais atrasados primeiro, excedente volta no dia seguinte", () => {
    const clock = new FixedClock(START);
    const hour = 3_600_000;
    const make = (id: string, dueAt: Date, lapses = 0): SrsCard => ({
      ...createSrsCard({ id, front: id, back: id, type: "word" }, dueAt),
      lapses,
    });
    const older = Array.from({ length: 18 }, (_, i) =>
      make(`old-${String(i).padStart(2, "0")}`, new Date(START.getTime() - (48 + i) * hour)),
    );
    const tiedDue = new Date(START.getTime() - 24 * hour);
    const tied = Array.from({ length: 7 }, (_, i) => make(`tie-${i}`, tiedDue, i));
    let cards = [...tied, ...older];
    expect(cards).toHaveLength(25);

    const { selected, overflow } = selectDueCards(cards, clock.now(), DAILY_REVIEW_LIMIT);
    expect(overflow).toBe(5);
    expect(selected).toHaveLength(20);
    expect(selected.slice(0, 18).every((c) => c.id.startsWith("old-"))).toBe(true);
    expect(selected.slice(18).map((c) => c.id)).toEqual(["tie-6", "tie-5"]);

    const firstDay = scheduler.dueCards(cards, clock.now(), DAILY_REVIEW_LIMIT);
    expect(firstDay).toHaveLength(20);
    const reviewed = new Map(firstDay.map((c) => [c.id, scheduler.review(c, 4, clock.now())]));
    cards = cards.map((c) => reviewed.get(c.id) ?? c);
    clock.advanceDays(1);

    const nextDay = scheduler.dueCards(cards, clock.now(), DAILY_REVIEW_LIMIT);
    expect(nextDay).toHaveLength(20);
    expect(nextDay.slice(0, 5).map((c) => c.id)).toEqual([
      "tie-4",
      "tie-3",
      "tie-2",
      "tie-1",
      "tie-0",
    ]);
  });
});
