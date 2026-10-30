import Dexie, { type DexieOptions, type EntityTable, type Table } from "dexie";
import type { CefrLevel } from "@/domain/value-objects/cefr-level";
import type { Skill } from "@/domain/value-objects/skill";

/**
 * Base local (IndexedDB), fonte de verdade offline. As escritas de dominio
 * enfileiram uma operacao na `outbox`, que o SyncEngine envia ao Supabase.
 */
export interface LocalSrsCard {
  id: string;
  userId: string;
  front: string;
  back: string;
  type: "word" | "phrase" | "structure";
  ease: number;
  intervalDays: number;
  dueAt: number;
  lapses: number;
  sourceLessonId: string | null;
  /** Epoch ms da ultima escrita local (via ClockPort). */
  updatedAt: number;
}

export interface LocalStudentModel {
  userId: string;
  levels: Record<Skill, CefrLevel>;
  vocabSize: number;
  pace: {
    avgSecondsPerExercise: number;
    sessionCompletionRate: number;
    usualHour: number | null;
  };
  updatedAt: number;
}

export interface LocalStreak {
  userId: string;
  current: number;
  best: number;
  shieldsLeft: number;
  lastDay: string | null;
  updatedAt: number;
}

export interface LocalTopicMastery {
  userId: string;
  topicId: string;
  accuracy: number;
  attempts: number;
  sessions: number;
  lastSeen: number | null;
  status: "locked" | "learning" | "review" | "mastered";
  updatedAt: number;
}

export interface LocalErrorLog {
  userId: string;
  code: string;
  example: string;
  count: number;
  lastAt: number;
  skill: string;
  updatedAt: number;
}

/** Copia de lição/unidade para uso offline; `data` guarda o JSON ja validado. */
export interface LocalLesson {
  id: string;
  unitId: string;
  dayIndex: number;
  data: unknown;
  updatedAt: number;
}

export interface LocalUnit {
  id: string;
  data: unknown;
  updatedAt: number;
}

export interface PendingOperation {
  id?: number;
  userId: string;
  kind: string;
  /** Identifica a entidade alterada; uma nova operacao substitui a pendente da mesma chave. */
  entityKey: string;
  payload: unknown;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastError: string | null;
}

export class LocalDatabase extends Dexie {
  srsCards!: EntityTable<LocalSrsCard, "id">;
  studentModels!: EntityTable<LocalStudentModel, "userId">;
  streaks!: EntityTable<LocalStreak, "userId">;
  topicMastery!: Table<LocalTopicMastery, [string, string]>;
  errorLog!: Table<LocalErrorLog, [string, string]>;
  lessons!: EntityTable<LocalLesson, "id">;
  units!: EntityTable<LocalUnit, "id">;
  outbox!: EntityTable<PendingOperation, "id">;

  constructor(name = "fluente365", options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      srsCards: "id, userId, dueAt, dirty, [userId+dueAt]",
      outbox: "++id, userId, createdAt",
    });
    this.version(2).stores({
      srsCards: "id, userId, dueAt, [userId+dueAt]",
      studentModels: "userId",
      streaks: "userId",
      topicMastery: "[userId+topicId], userId",
      errorLog: "[userId+code], userId, [userId+lastAt]",
      lessons: "id, [unitId+dayIndex]",
      units: "id",
      outbox: "++id, userId, createdAt, [userId+kind+entityKey]",
    });
  }
}

let instance: LocalDatabase | null = null;

/** Lazy: IndexedDB so existe no navegador, nunca durante o build no servidor. */
export function localDb(): LocalDatabase {
  if (typeof window === "undefined") {
    throw new Error("localDb() so pode ser chamado no navegador.");
  }
  instance ??= new LocalDatabase();
  return instance;
}
