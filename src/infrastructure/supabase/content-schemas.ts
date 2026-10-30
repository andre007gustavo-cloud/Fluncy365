import { z } from "zod";
import type { JwRef, Lesson, UnitSpec } from "@/domain/entities/lesson";
import { SKILLS } from "@/domain/value-objects/skill";

// Zod na borda: JSON do banco (e do cache local) so vira entidade depois de validado.
const stringPair = z.tuple([z.string(), z.string()]);

const answerSpecSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("exact"),
    accepted: z.array(z.string()),
    caseSensitive: z.boolean(),
    wordBank: z.array(z.string()).optional(),
  }),
  z.object({ mode: z.literal("truth"), answer: z.boolean() }),
  z.object({
    mode: z.literal("choice"),
    options: z.array(z.string()),
    correctIndex: z.number().int(),
  }),
  z.object({ mode: z.literal("sequence"), correctOrder: z.array(z.string()) }),
  z.object({ mode: z.literal("pairs"), pairs: z.array(stringPair) }),
  z.object({
    mode: z.literal("rubric"),
    criteria: z.array(z.string()),
    minWords: z.number().int(),
  }),
]);

const exerciseSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "multiple_choice",
    "gap_fill",
    "reorder",
    "match",
    "dictation",
    "true_false",
    "open_writing",
    "translation",
    "read_aloud",
  ]),
  skill: z.enum(SKILLS),
  difficulty: z.number(),
  prompt: z.object({
    text: z.string(),
    instructionPt: z.string(),
    audioUrl: z.string().optional(),
    jwRefId: z.string().optional(),
  }),
  answerSpec: answerSpecSchema,
  srsItems: z.array(z.string()),
});

const lessonBlockSchema = z.object({
  kind: z.enum(["explanation", "example", "input_real", "closing"]),
  titlePt: z.string(),
  bodyPt: z.string(),
  examplesEn: z.array(z.string()),
});

export const lessonSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  dayIndex: z.number().int(),
  blocks: z.array(lessonBlockSchema),
  exercises: z.array(exerciseSchema),
  status: z.enum(["seed", "auto", "approved"]),
  version: z.number().int(),
});

export const unitSchema = z.object({
  id: z.string(),
  month: z.number().int(),
  week: z.number().int(),
  level: z.number(),
  grammarTopics: z.array(z.string()),
  vocabList: z.array(z.string()),
  ptErrorTargets: z.array(z.string()),
  jwRefs: z.array(z.string()),
  murphyRef: z.string().nullable(),
  masteryCriteria: z.object({ minAccuracy: z.number(), minAttempts: z.number() }),
});

const lessonRowSchema = z.object({
  id: z.string(),
  unit_id: z.string(),
  day_index: z.number().int(),
  blocks: z.unknown(),
  exercises: z.unknown(),
  status: z.enum(["seed", "auto", "approved"]),
  version: z.number().int(),
});

const unitRowSchema = z.object({
  id: z.string(),
  month: z.number().int(),
  week: z.number().int(),
  level: z.number(),
  grammar_topics: z.array(z.string()),
  vocab_list: z.array(z.string()),
  pt_error_targets: z.array(z.string()),
  jw_refs: z.array(z.string()),
  murphy_ref: z.string().nullable(),
  mastery_criteria: z.unknown(),
});

const jwRefRowSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  type: z.enum(["article", "audio", "video"]),
  level: z.number(),
  minutes: z.number().int(),
  topics: z.array(z.string()),
});

export function lessonFromRow(row: unknown): Lesson {
  const parsed = lessonRowSchema.parse(row);
  return lessonSchema.parse({
    id: parsed.id,
    unitId: parsed.unit_id,
    dayIndex: parsed.day_index,
    blocks: parsed.blocks,
    exercises: parsed.exercises,
    status: parsed.status,
    version: parsed.version,
  });
}

export function unitFromRow(row: unknown): UnitSpec {
  const parsed = unitRowSchema.parse(row);
  return unitSchema.parse({
    id: parsed.id,
    month: parsed.month,
    week: parsed.week,
    level: parsed.level,
    grammarTopics: parsed.grammar_topics,
    vocabList: parsed.vocab_list,
    ptErrorTargets: parsed.pt_error_targets,
    jwRefs: parsed.jw_refs,
    murphyRef: parsed.murphy_ref,
    masteryCriteria: parsed.mastery_criteria,
  });
}

export function jwRefFromRow(row: unknown): JwRef {
  return jwRefRowSchema.parse(row);
}
