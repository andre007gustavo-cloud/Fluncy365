import { describe, expect, it } from "vitest";
import { createStreak, recordStudyDay, streakAsOf, type Streak } from "./streak";

const base = (over: Partial<Streak>): Streak => ({
  current: 5,
  best: 5,
  shieldsLeft: 2,
  lastDay: "2025-03-10",
  ...over,
});

describe("createStreak", () => {
  it("começa zerado com 2 escudos", () => {
    expect(createStreak()).toEqual({ current: 0, best: 0, shieldsLeft: 2, lastDay: null });
  });
});

describe("recordStudyDay", () => {
  it("primeiro estudo: current 1, best 1, 2 escudos", () => {
    expect(recordStudyDay(createStreak(), "2025-03-10")).toEqual({
      current: 1,
      best: 1,
      shieldsLeft: 2,
      lastDay: "2025-03-10",
    });
  });

  it("dia seguinte soma 1", () => {
    const s = recordStudyDay(base({}), "2025-03-11");
    expect(s).toMatchObject({ current: 6, best: 6, shieldsLeft: 2, lastDay: "2025-03-11" });
  });

  it("mesmo dia duas vezes não muda nada", () => {
    const s = base({});
    expect(recordStudyDay(s, "2025-03-10")).toEqual(s);
  });

  it("relógio voltando não muda nada", () => {
    const s = base({});
    expect(recordStudyDay(s, "2025-03-05")).toEqual(s);
  });

  it("1 dia perdido consome 1 escudo e mantém o streak (só o estudo soma)", () => {
    const s = recordStudyDay(base({}), "2025-03-12");
    expect(s).toMatchObject({ current: 6, shieldsLeft: 1 });
  });

  it("2 dias perdidos consomem os 2 escudos", () => {
    const s = recordStudyDay(base({}), "2025-03-13");
    expect(s).toMatchObject({ current: 6, shieldsLeft: 0 });
  });

  it("3 dias perdidos quebram; recomeça em 1 com escudos zerados no mês", () => {
    const s = recordStudyDay(base({}), "2025-03-14");
    expect(s).toMatchObject({ current: 1, best: 5, shieldsLeft: 0, lastDay: "2025-03-14" });
  });

  it("quebra antes da virada de mês e estudo já no mês novo: escudos em 2", () => {
    const s = recordStudyDay(base({ lastDay: "2025-03-30", shieldsLeft: 0 }), "2025-04-03");
    expect(s).toMatchObject({ current: 1, shieldsLeft: 2 });
  });

  it("dias perdidos atravessando o mês: escudos do mês novo começam em 2", () => {
    const s = recordStudyDay(base({ lastDay: "2025-03-31", shieldsLeft: 0 }), "2025-04-02");
    expect(s).toMatchObject({ current: 6, shieldsLeft: 1 });
  });

  it("virada de mês sem dia perdido volta a 2, não a 4", () => {
    const s = recordStudyDay(base({ lastDay: "2025-03-31", shieldsLeft: 2 }), "2025-04-01");
    expect(s.shieldsLeft).toBe(2);
  });

  it("mês sem usar escudo continua com 2", () => {
    let s = recordStudyDay(createStreak(), "2025-03-01");
    for (let d = 2; d <= 31; d++) s = recordStudyDay(s, `2025-03-${String(d).padStart(2, "0")}`);
    expect(s).toMatchObject({ current: 31, shieldsLeft: 2 });
  });

  it("streak 0 não gasta escudo", () => {
    const s = recordStudyDay(base({ current: 0, best: 7, shieldsLeft: 2 }), "2025-03-20");
    expect(s).toMatchObject({ current: 1, best: 7, shieldsLeft: 2 });
  });

  it("best nunca diminui", () => {
    const s = recordStudyDay(base({ best: 40 }), "2025-03-20");
    expect(s).toMatchObject({ current: 1, best: 40 });
  });

  it("virada de ano", () => {
    const s = recordStudyDay(base({ lastDay: "2025-12-31", shieldsLeft: 1 }), "2026-01-02");
    expect(s).toMatchObject({ current: 6, shieldsLeft: 1, lastDay: "2026-01-02" });
  });

  it("não muta a entrada", () => {
    const s = base({});
    const copy = { ...s };
    recordStudyDay(s, "2025-03-14");
    expect(s).toEqual(copy);
  });

  it("lança erro com lastDay ou dia inválidos", () => {
    expect(() => recordStudyDay(base({ lastDay: "2025-13-01" }), "2025-03-11")).toThrow();
    expect(() => recordStudyDay(base({}), "2025-02-30")).toThrow();
  });
});

describe("streakAsOf", () => {
  it("sem estudo anterior devolve a entrada", () => {
    const s = createStreak();
    expect(streakAsOf(s, "2025-03-10")).toEqual(s);
  });

  it("hoje, ontem ou relógio voltado: nada muda", () => {
    const s = base({});
    expect(streakAsOf(s, "2025-03-10")).toEqual(s);
    expect(streakAsOf(s, "2025-03-11")).toEqual(s);
    expect(streakAsOf(s, "2025-03-01")).toEqual(s);
  });

  it("mostra escudo consumido até ontem sem registrar estudo", () => {
    const s = base({});
    expect(streakAsOf(s, "2025-03-12")).toEqual({ ...s, shieldsLeft: 1 });
  });

  it("mostra a quebra", () => {
    const s = base({});
    expect(streakAsOf(s, "2025-03-14")).toEqual({ ...s, current: 0, shieldsLeft: 0 });
  });

  it("mostra escudos do mês atual", () => {
    const s = base({ lastDay: "2025-03-31", shieldsLeft: 0 });
    expect(streakAsOf(s, "2025-04-01").shieldsLeft).toBe(2);
  });

  it("não muta a entrada", () => {
    const s = base({});
    const copy = { ...s };
    streakAsOf(s, "2025-03-14");
    expect(s).toEqual(copy);
  });

  it("lança erro com lastDay inválido", () => {
    expect(() => streakAsOf(base({ lastDay: "abc" }), "2025-03-11")).toThrow();
  });
});
