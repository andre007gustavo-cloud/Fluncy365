import { describe, expect, it } from "vitest";
import { clampDifficulty, DIFFICULTY_MAX, DIFFICULTY_MIN } from "./difficulty";
import { isSkill, SKILLS } from "./skill";
import { addXp, xp } from "./xp";

describe("clampDifficulty", () => {
  it("arredonda e mantem dentro de 1..10", () => {
    expect(clampDifficulty(4.4)).toBe(4);
    expect(clampDifficulty(4.6)).toBe(5);
  });

  it("limita os extremos", () => {
    expect(clampDifficulty(-8)).toBe(DIFFICULTY_MIN);
    expect(clampDifficulty(99)).toBe(DIFFICULTY_MAX);
    expect(clampDifficulty(Number.NaN)).toBe(DIFFICULTY_MIN);
  });
});

describe("isSkill", () => {
  it("aceita as quatro habilidades", () => {
    for (const skill of SKILLS) expect(isSkill(skill)).toBe(true);
  });

  it("rejeita qualquer outra coisa", () => {
    expect(isSkill("grammar")).toBe(false);
    expect(isSkill(42)).toBe(false);
    expect(isSkill(null)).toBe(false);
  });
});

describe("xp", () => {
  it("sempre inteiro e nunca negativo", () => {
    expect(xp(12.6)).toBe(13);
    expect(xp(-50)).toBe(0);
  });

  it("soma sem deixar o total negativo", () => {
    expect(addXp(100, 25)).toBe(125);
    expect(addXp(10, -80)).toBe(0);
  });
});
