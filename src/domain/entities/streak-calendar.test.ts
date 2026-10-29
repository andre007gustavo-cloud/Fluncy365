import { describe, expect, it } from "vitest";
import { addDays, assertDay, daysBetween, monthOf } from "./streak-calendar";

describe("addDays", () => {
  it("vira o mes", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("vira o ano", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("respeita ano bissexto e nao bissexto", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("aceita valores negativos e zero", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-05-10", 0)).toBe("2026-05-10");
  });

  it("rejeita dia invalido e quantidade nao inteira", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow();
    expect(() => addDays("2026-02-01", 1.5)).toThrow();
  });
});

describe("daysBetween", () => {
  it("retorna 0 para o mesmo dia", () => {
    expect(daysBetween("2026-05-10", "2026-05-10")).toBe(0);
  });

  it("retorna positivo quando b e depois de a", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("retorna negativo quando b e antes de a", () => {
    expect(daysBetween("2026-05-10", "2026-05-07")).toBe(-3);
  });

  it("rejeita dia invalido", () => {
    expect(() => daysBetween("abc", "2026-05-10")).toThrow();
    expect(() => daysBetween("2026-05-10", "2026-13-01")).toThrow();
  });
});

describe("monthOf", () => {
  it("retorna ano e mes", () => {
    expect(monthOf("2026-09-08")).toBe("2026-09");
    expect(monthOf("2027-01-01")).toBe("2027-01");
  });

  it("rejeita dia invalido", () => {
    expect(() => monthOf("2026-1-5")).toThrow();
  });
});

describe("assertDay", () => {
  it("aceita datas validas", () => {
    expect(() => assertDay("2026-09-08")).not.toThrow();
    expect(() => assertDay("2028-02-29")).not.toThrow();
  });

  it.each(["2026-13-01", "2026-02-30", "2026-02-29", "abc", "2026-1-5", "", "2026-09-08T10:00"])(
    "rejeita %j com mensagem util",
    (value) => {
      expect(() => assertDay(value)).toThrow(/Dia inválido/);
    },
  );
});
