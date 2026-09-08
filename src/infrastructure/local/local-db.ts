import Dexie, { type EntityTable } from "dexie";

/**
 * Base local (IndexedDB). Na Fase 0 ela apenas existe e versiona o schema;
 * o SyncEngine que a torna fonte de verdade offline entra na Fase 1.
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
  dirty: 0 | 1;
}

export interface PendingOperation {
  id?: number;
  userId: string;
  kind: string;
  payload: unknown;
  createdAt: number;
}

export class LocalDatabase extends Dexie {
  srsCards!: EntityTable<LocalSrsCard, "id">;
  outbox!: EntityTable<PendingOperation, "id">;

  constructor() {
    super("fluente365");
    this.version(1).stores({
      srsCards: "id, userId, dueAt, dirty, [userId+dueAt]",
      outbox: "++id, userId, createdAt",
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
