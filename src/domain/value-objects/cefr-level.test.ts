import { describe, expect, it } from "vitest";
import { cefrBand, cefrLabel, clampCefr } from "./cefr-level";

describe("clampCefr", () => {
  it("mantem valores dentro da escala", () => {
    expect(clampCefr(2.4)).toBe(2.4);
  });

  it("limita abaixo de A1 e acima de C2", () => {
    expect(clampCefr(0.2)).toBe(1);
    expect(clampCefr(9)).toBe(6);
  });

  it("trata NaN como A1", () => {
    expect(clampCefr(Number.NaN)).toBe(1);
  });
});

describe("cefrBand", () => {
  it("mapeia a faixa correta", () => {
    expect(cefrBand(1.0)).toBe("A1");
    expect(cefrBand(2.9)).toBe("A2");
    expect(cefrBand(3.0)).toBe("B1");
    expect(cefrBand(6.0)).toBe("C2");
  });
});

describe("cefrLabel", () => {
  it("formata para a UI", () => {
    expect(cefrLabel(2.4)).toBe("A2.4");
    expect(cefrLabel(1.0)).toBe("A1.0");
    expect(cefrLabel(6.0)).toBe("C2.0");
  });
});
