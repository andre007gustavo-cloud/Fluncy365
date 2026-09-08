import { describe, expect, it } from "vitest";
import type { SrsCard } from "../entities/srs-card";
import { selectDueCards } from "./select-due-cards";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function card(id: string, dueAt: string, lapses = 0): SrsCard {
  return {
    id,
    front: `front-${id}`,
    back: `back-${id}`,
    type: "word",
    ease: 2.5,
    intervalDays: 1,
    dueAt: new Date(dueAt),
    lapses,
    sourceLessonId: null,
  };
}

describe("selectDueCards", () => {
  it("ignora cartoes com revisao no futuro", () => {
    const cards = [card("a", "2026-09-09T00:00:00.000Z"), card("b", "2026-09-07T00:00:00.000Z")];

    const { selected, overflow } = selectDueCards(cards, NOW, 20);

    expect(selected.map((c) => c.id)).toEqual(["b"]);
    expect(overflow).toBe(0);
  });

  it("inclui o cartao que vence exatamente agora", () => {
    const { selected } = selectDueCards([card("a", NOW.toISOString())], NOW, 20);

    expect(selected).toHaveLength(1);
  });

  it("coloca o mais atrasado primeiro", () => {
    const cards = [
      card("recente", "2026-09-08T09:00:00.000Z"),
      card("antigo", "2026-09-01T09:00:00.000Z"),
      card("medio", "2026-09-05T09:00:00.000Z"),
    ];

    const { selected } = selectDueCards(cards, NOW, 20);

    expect(selected.map((c) => c.id)).toEqual(["antigo", "medio", "recente"]);
  });

  it("em empate de data, prioriza o cartao com mais lapsos", () => {
    const cards = [
      card("facil", "2026-09-05T09:00:00.000Z", 0),
      card("dificil", "2026-09-05T09:00:00.000Z", 4),
    ];

    const { selected } = selectDueCards(cards, NOW, 20);

    expect(selected.map((c) => c.id)).toEqual(["dificil", "facil"]);
  });

  it("respeita o teto e reporta o excedente", () => {
    const cards = Array.from({ length: 25 }, (_, i) =>
      card(`c${String(i).padStart(2, "0")}`, "2026-09-05T09:00:00.000Z"),
    );

    const { selected, overflow } = selectDueCards(cards, NOW, 20);

    expect(selected).toHaveLength(20);
    expect(overflow).toBe(5);
  });

  it("trata teto zero ou negativo sem quebrar", () => {
    const cards = [card("a", "2026-09-05T09:00:00.000Z")];

    expect(selectDueCards(cards, NOW, 0).selected).toEqual([]);
    expect(selectDueCards(cards, NOW, -3).overflow).toBe(1);
  });

  it("nao modifica o array recebido", () => {
    const cards = [card("b", "2026-09-07T00:00:00.000Z"), card("a", "2026-09-01T00:00:00.000Z")];

    selectDueCards(cards, NOW, 20);

    expect(cards.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("devolve lista vazia quando nada venceu", () => {
    const { selected, overflow } = selectDueCards([card("a", "2026-10-01T00:00:00.000Z")], NOW, 20);

    expect(selected).toEqual([]);
    expect(overflow).toBe(0);
  });
});
