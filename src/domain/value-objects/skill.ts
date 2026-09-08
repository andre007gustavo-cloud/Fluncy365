export const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

export type Skill = (typeof SKILLS)[number];

export function isSkill(value: unknown): value is Skill {
  return typeof value === "string" && (SKILLS as readonly string[]).includes(value);
}
