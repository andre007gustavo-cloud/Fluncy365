import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentError, StudentModel, TopicMastery } from "@/domain/entities/student";
import { MONTHLY_SHIELDS, type Streak } from "@/domain/entities/streak";
import type { CourseId } from "@/domain/value-objects/course-id";
import { SKILLS } from "@/domain/value-objects/skill";
import type {
  ErrorLogRepositoryPort,
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
  TopicMasteryRepositoryPort,
} from "@/domain/ports/student-repository.port";
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

const topicMasteryRowSchema = z.object({
  topic_id: z.string(),
  accuracy: z.number(),
  attempts: z.number().int(),
  sessions: z.number().int(),
  last_seen: z.string().nullable(),
  status: z.enum(["locked", "learning", "review", "mastered"]),
});

const errorLogRowSchema = z.object({
  code: z.string(),
  example: z.string(),
  count: z.number().int(),
  last_at: z.string(),
  skill: z.enum(SKILLS),
});

export function topicMasteryFromRow(row: unknown): TopicMastery {
  const parsed = topicMasteryRowSchema.parse(row);
  return {
    topicId: parsed.topic_id,
    accuracy: parsed.accuracy,
    attempts: parsed.attempts,
    sessions: parsed.sessions,
    lastSeen: parsed.last_seen === null ? null : new Date(parsed.last_seen),
    status: parsed.status,
  };
}

export function topicMasteryToRow(userId: string, courseId: CourseId, mastery: TopicMastery) {
  return {
    user_id: userId,
    course_id: courseId,
    topic_id: mastery.topicId,
    accuracy: mastery.accuracy,
    attempts: mastery.attempts,
    sessions: mastery.sessions,
    last_seen: mastery.lastSeen?.toISOString() ?? null,
    status: mastery.status,
  };
}

export function studentErrorFromRow(row: unknown): StudentError {
  const parsed = errorLogRowSchema.parse(row);
  return {
    code: parsed.code,
    example: parsed.example,
    count: parsed.count,
    lastAt: new Date(parsed.last_at),
    skill: parsed.skill,
  };
}

export function studentErrorToRow(userId: string, courseId: CourseId, error: StudentError) {
  return {
    user_id: userId,
    course_id: courseId,
    code: error.code,
    example: error.example,
    count: error.count,
    last_at: error.lastAt.toISOString(),
    skill: error.skill,
  };
}

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

  async listAll(userId: string, courseId: CourseId): Promise<readonly SrsCard[]> {
    const { data, error } = await this.supabase
      .from("srs_cards")
      .select("id, front, back, type, ease, interval_days, due_at, lapses, source_lesson_id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("due_at", { ascending: true });

    if (error) fail("listAll srs_cards", error);
    return srsCardRowSchema
      .array()
      .parse(data ?? [])
      .map(toSrsCard);
  }

  async listDue(
    userId: string,
    courseId: CourseId,
    now: Date,
    limit: number,
  ): Promise<readonly SrsCard[]> {
    const { data, error } = await this.supabase
      .from("srs_cards")
      .select("id, front, back, type, ease, interval_days, due_at, lapses, source_lesson_id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .lte("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(Math.max(0, limit));

    if (error) fail("listDue srs_cards", error);
    return srsCardRowSchema
      .array()
      .parse(data ?? [])
      .map(toSrsCard);
  }

  async upsertMany(userId: string, courseId: CourseId, cards: readonly SrsCard[]): Promise<void> {
    if (cards.length === 0) return;

    const { error } = await this.supabase.from("srs_cards").upsert(
      cards.map((card) => ({
        id: card.id,
        user_id: userId,
        course_id: courseId,
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

  async load(userId: string, courseId: CourseId): Promise<StudentModel | null> {
    const { data, error } = await this.supabase
      .from("student_models")
      .select("user_id, levels, vocab_size, pace, updated_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
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

  async save(model: StudentModel, courseId: CourseId): Promise<void> {
    const { error } = await this.supabase.from("student_models").upsert(
      {
        user_id: model.userId,
        course_id: courseId,
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

  async load(userId: string, courseId: CourseId): Promise<Streak> {
    const { data, error } = await this.supabase
      .from("gamification")
      .select("streak")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (error) fail("load gamification", error);
    if (!data) return { current: 0, best: 0, shieldsLeft: MONTHLY_SHIELDS, lastDay: null };

    return streakSchema.parse(data.streak);
  }

  async save(userId: string, courseId: CourseId, streak: Streak): Promise<void> {
    // upsert (e nao update): update em 0 linhas nao gera erro e o ack da fila
    // descartaria o streak em silencio. As demais colunas tem default.
    const { error } = await this.supabase.from("gamification").upsert(
      {
        user_id: userId,
        course_id: courseId,
        streak: streakToJson(streak),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" },
    );

    if (error) fail("save gamification", error);
  }
}

export class SupabaseTopicMasteryRepository implements TopicMasteryRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async list(userId: string, courseId: CourseId): Promise<readonly TopicMastery[]> {
    const { data, error } = await this.supabase
      .from("topic_mastery")
      .select("topic_id, accuracy, attempts, sessions, last_seen, status")
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (error) fail("list topic_mastery", error);
    return (data ?? []).map(topicMasteryFromRow);
  }

  async upsert(userId: string, courseId: CourseId, mastery: TopicMastery): Promise<void> {
    const { error } = await this.supabase
      .from("topic_mastery")
      .upsert(topicMasteryToRow(userId, courseId, mastery), {
        onConflict: "user_id,course_id,topic_id",
      });

    if (error) fail("upsert topic_mastery", error);
  }
}

/** `record` grava o registro completo do codigo: quem chama ja traz a contagem atualizada. */
export class SupabaseErrorLogRepository implements ErrorLogRepositoryPort {
  constructor(private readonly supabase: Supabase) {}

  async listRecent(
    userId: string,
    courseId: CourseId,
    limit: number,
  ): Promise<readonly StudentError[]> {
    const { data, error } = await this.supabase
      .from("error_log")
      .select("code, example, count, last_at, skill")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("last_at", { ascending: false })
      .limit(Math.max(0, limit));

    if (error) fail("listRecent error_log", error);
    return (data ?? []).map(studentErrorFromRow);
  }

  async record(userId: string, courseId: CourseId, studentError: StudentError): Promise<void> {
    const { error } = await this.supabase
      .from("error_log")
      .upsert(studentErrorToRow(userId, courseId, studentError), {
        onConflict: "user_id,course_id,code",
      });

    if (error) fail("record error_log", error);
  }
}
