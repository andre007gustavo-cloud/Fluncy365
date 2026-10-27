import { describe, expect, it } from "vitest";
import { SRS_MIN_EASE, type ReviewQuality } from "../entities/srs-card";
import { nextEase, nextInterval } from "./srs-scheduler";

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
