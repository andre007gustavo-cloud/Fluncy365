import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentModel } from "@/domain/entities/student";
import { MONTHLY_SHIELDS, type Streak } from "@/domain/entities/streak";
import type {
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
} from "@/domain/ports/student-repository.port";
import { DEFAULT_COURSE_ID } from "./course";
import type { Database, Json } from "./database.types";

export type Supabase = SupabaseClient<Database>;

// Zod na borda: o que vem do banco so vira entidade depois de validado.
const srsCardRowSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  type: z.enum(["word", "phrase", "structure"]),
  ease: z.number(),
  interval_days: z.number().int(),
  due_at: z.string(),
  lapses: z.number().int(),
  source_lesson_id: z.string().nullable(),
});

const levelsSchema = z.object({
  reading: z.number(),
  listening: z.number(),
  writing: z.number(),
  speaking: z.number(),
});

const studentModelRowSchema = z.object({
  user_id: z.string(),
  levels: levelsSchema,
  vocab_size: z.number().int(),
  pace: z.object({
    avgSecondsPerExercise: z.number(),
    sessionCompletionRate: z.number(),
    usualHour: z.number().nullable(),
  }),
  updated_at: z.string(),
});

const streakSchema = z.object({
  current: z.number().int(),
  best: z.number().int(),
  shieldsLeft: z.number().int(),
  lastDay: z.string().nullable(),
});

function toSrsCard(row: z.infer<typeof srsCardRowSchema>): SrsCard {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    type: row.type,
    ease: row.ease,
    intervalDays: row.interval_days,
    dueAt: new Date(row.due_at),
    lapses: row.lapses,
    sourceLessonId: row.source_lesson_id,
  };
}

function streakToJson(streak: Streak): Json {
  return {
    current: streak.current,
    best: streak.best,
    shieldsLeft: streak.shieldsLeft,
    lastDay: streak.lastDay,
  };
}

function fail(context: string, error: { message: string }): never {
  throw new Error(`Supabase (${context}): ${error.message}`);
}

export class SupabaseSrsCardRepository implements SrsCardRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async listAll(userId: string): Promise<readonly SrsCard[]> {
    const { data, error } = await this.supabase
      .from("srs_cards")
      .select("id, front, back, type, ease, interval_days, due_at, lapses, source_lesson_id")
      .eq("user_id", userId)
      .eq("course_id", DEFAULT_COURSE_ID)
      .order("due_at", { ascending: true });

    if (error) fail("listAll srs_cards", error);
    return srsCardRowSchema
      .array()
      .parse(data ?? [])
      .map(toSrsCard);
  }

  async listDue(userId: string, now: Date, limit: number): Promise<readonly SrsCard[]> {
    const { data, error } = await this.supabase
      .from("srs_cards")
      .select("id, front, back, type, ease, interval_days, due_at, lapses, source_lesson_id")
      .eq("user_id", userId)
      .eq("course_id", DEFAULT_COURSE_ID)
      .lte("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(Math.max(0, limit));

    if (error) fail("listDue srs_cards", error);
    return srsCardRowSchema
      .array()
      .parse(data ?? [])
      .map(toSrsCard);
  }

  async upsertMany(userId: string, cards: readonly SrsCard[]): Promise<void> {
    if (cards.length === 0) return;

    const { error } = await this.supabase.from("srs_cards").upsert(
      cards.map((card) => ({
        id: card.id,
        user_id: userId,
        course_id: DEFAULT_COURSE_ID,
        front: card.front,
        back: card.back,
        type: card.type,
        ease: card.ease,
        interval_days: card.intervalDays,
        due_at: card.dueAt.toISOString(),
        lapses: card.lapses,
        source_lesson_id: card.sourceLessonId,
      })),
    );

    if (error) fail("upsertMany srs_cards", error);
  }
}

export class SupabaseStudentModelRepository implements StudentModelRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async load(userId: string): Promise<StudentModel | null> {
    const { data, error } = await this.supabase
      .from("student_models")
      .select("user_id, levels, vocab_size, pace, updated_at")
      .eq("user_id", userId)
      .eq("course_id", DEFAULT_COURSE_ID)
      .maybeSingle();

    if (error) fail("load student_models", error);
    if (!data) return null;

    const row = studentModelRowSchema.parse(data);
    return {
      userId: row.user_id,
      levels: row.levels,
      vocabSize: row.vocab_size,
      pace: row.pace,
      updatedAt: new Date(row.updated_at),
    };
  }

  async save(model: StudentModel): Promise<void> {
    const { error } = await this.supabase.from("student_models").upsert(
      {
        user_id: model.userId,
        course_id: DEFAULT_COURSE_ID,
        levels: model.levels,
        vocab_size: model.vocabSize,
        pace: {
          avgSecondsPerExercise: model.pace.avgSecondsPerExercise,
          sessionCompletionRate: model.pace.sessionCompletionRate,
          usualHour: model.pace.usualHour,
        },
        updated_at: model.updatedAt.toISOString(),
      },
      { onConflict: "user_id,course_id" },
    );

    if (error) fail("save student_models", error);
  }
}

export class SupabaseStreakRepository implements StreakRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async load(userId: string): Promise<Streak> {
    const { data, error } = await this.supabase
      .from("gamification")
      .select("streak")
      .eq("user_id", userId)
      .eq("course_id", DEFAULT_COURSE_ID)
      .maybeSingle();

    if (error) fail("load gamification", error);
    if (!data) return { current: 0, best: 0, shieldsLeft: MONTHLY_SHIELDS, lastDay: null };

    return streakSchema.parse(data.streak);
  }

  async save(userId: string, streak: Streak): Promise<void> {
    const { error } = await this.supabase
      .from("gamification")
      .update({ streak: streakToJson(streak), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("course_id", DEFAULT_COURSE_ID);

    if (error) fail("save gamification", error);
  }
}
