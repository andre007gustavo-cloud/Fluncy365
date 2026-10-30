import { z } from "zod";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentError, StudentModel, TopicMastery } from "@/domain/entities/student";
import type { Streak } from "@/domain/entities/streak";
import { SKILLS } from "@/domain/value-objects/skill";
import type { LocalDatabase, PendingOperation } from "./local-db";

export type SyncOperation =
  | { kind: "srsCards.upsert"; payload: SrsCard }
  | { kind: "studentModel.save"; payload: StudentModel }
  | { kind: "streak.save"; payload: Streak }
  | { kind: "topicMastery.upsert"; payload: TopicMastery }
  | { kind: "errorLog.record"; payload: StudentError };

export type SyncOperationKind = SyncOperation["kind"];

export interface QueuedOperation {
  id: number;
  userId: string;
  operation: SyncOperation;
  attempts: number;
  lastError: string | null;
  revision: number;
}

export class InvalidQueuedOperationError extends Error {
  constructor(id: number | undefined, reason: string) {
    super(`Operacao ${id ?? "?"} da fila offline esta invalida: ${reason}`);
    this.name = "InvalidQueuedOperationError";
  }
}

const srsCardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  type: z.enum(["word", "phrase", "structure"]),
  ease: z.number(),
  intervalDays: z.number(),
  dueAt: z.date(),
  lapses: z.number(),
  sourceLessonId: z.string().nullable(),
});

const studentModelSchema = z.object({
  userId: z.string(),
  levels: z.object({
    reading: z.number(),
    listening: z.number(),
    writing: z.number(),
    speaking: z.number(),
  }),
  vocabSize: z.number(),
  pace: z.object({
    avgSecondsPerExercise: z.number(),
    sessionCompletionRate: z.number(),
    usualHour: z.number().nullable(),
  }),
  updatedAt: z.date(),
});

const streakSchema = z.object({
  current: z.number(),
  best: z.number(),
  shieldsLeft: z.number(),
  lastDay: z.string().nullable(),
});

const topicMasterySchema = z.object({
  topicId: z.string(),
  accuracy: z.number(),
  attempts: z.number(),
  sessions: z.number(),
  lastSeen: z.date().nullable(),
  status: z.enum(["locked", "learning", "review", "mastered"]),
});

const studentErrorSchema = z.object({
  code: z.string(),
  example: z.string(),
  count: z.number(),
  lastAt: z.date(),
  skill: z.enum(SKILLS),
});

const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("srsCards.upsert"), payload: srsCardSchema }),
  z.object({ kind: z.literal("studentModel.save"), payload: studentModelSchema }),
  z.object({ kind: z.literal("streak.save"), payload: streakSchema }),
  z.object({ kind: z.literal("topicMastery.upsert"), payload: topicMasterySchema }),
  z.object({ kind: z.literal("errorLog.record"), payload: studentErrorSchema }),
]);

/** Identifica a entidade alterada; e a chave de coalescencia junto com userId+kind. */
export function entityKeyOf(operation: SyncOperation): string {
  switch (operation.kind) {
    case "srsCards.upsert":
      return operation.payload.id;
    case "topicMastery.upsert":
      return operation.payload.topicId;
    case "errorLog.record":
      return operation.payload.code;
    case "studentModel.save":
    case "streak.save":
      return "self";
  }
}

export function pendingKey(kind: string, entityKey: string): string {
  return `${kind}:${entityKey}`;
}

export class OfflineQueue {
  constructor(
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {}

  /**
   * Seguro dentro de uma transacao Dexie ja aberta (desde que inclua `outbox`):
   * o Dexie aninha a transacao em vez de abrir outra.
   *
   * A operacao pendente da mesma entidade e atualizada no lugar, mantendo o id:
   * cada operacao carrega o estado completo da entidade, entao reenviar so o
   * mais recente na posicao original preserva a ordem entre entidades diferentes
   * e nao empurra uma entidade antiga para o fim da fila.
   */
  async enqueue(userId: string, operation: SyncOperation): Promise<void> {
    const entityKey = entityKeyOf(operation);
    const updatedAt = this.clock.now().getTime();
    await this.db.transaction("rw", this.db.outbox, async () => {
      const existing = await this.db.outbox
        .where("[userId+kind+entityKey]")
        .equals([userId, operation.kind, entityKey])
        .first();
      if (existing?.id !== undefined) {
        await this.db.outbox.update(existing.id, {
          payload: operation.payload,
          updatedAt,
          attempts: 0,
          lastError: null,
          revision: existing.revision + 1,
        });
        return;
      }
      await this.db.outbox.add({
        userId,
        kind: operation.kind,
        entityKey,
        payload: operation.payload,
        createdAt: updatedAt,
        updatedAt,
        attempts: 0,
        lastError: null,
        revision: 0,
      });
    });
  }

  /** Lanca InvalidQueuedOperationError se algum registro nao passar na validacao. */
  async pending(userId: string): Promise<QueuedOperation[]> {
    const rows = await this.db.outbox.where("userId").equals(userId).sortBy("id");
    return rows.map(toQueuedOperation);
  }

  /**
   * Chaves `kind:entityKey` pendentes, sem validar o payload: o pull so precisa saber
   * quais entidades tem edicao local nao enviada, mesmo que a linha esteja corrompida.
   */
  async pendingKeys(userId: string): Promise<Set<string>> {
    const rows = await this.db.outbox.where("userId").equals(userId).toArray();
    return new Set(rows.map((row) => pendingKey(row.kind, row.entityKey)));
  }

  /**
   * Remove a operacao so se ela ainda estiver na revisao enviada. Se o aluno editou
   * a mesma entidade durante o envio, a linha fica com o payload novo para o proximo push.
   */
  async ack(id: number, sentRevision: number): Promise<boolean> {
    return this.db.transaction("rw", this.db.outbox, async () => {
      const row = await this.db.outbox.get(id);
      if (!row || row.revision !== sentRevision) return false;
      await this.db.outbox.delete(id);
      return true;
    });
  }

  async markFailed(id: number, error: string): Promise<void> {
    await this.db.transaction("rw", this.db.outbox, async () => {
      const row = await this.db.outbox.get(id);
      if (!row) return;
      await this.db.outbox.update(id, { attempts: row.attempts + 1, lastError: error });
    });
  }
}

function toQueuedOperation(row: PendingOperation): QueuedOperation {
  const parsed = operationSchema.safeParse({ kind: row.kind, payload: row.payload });
  if (!parsed.success) {
    const reason = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new InvalidQueuedOperationError(row.id, reason);
  }
  if (row.id === undefined) throw new InvalidQueuedOperationError(row.id, "sem id");
  return {
    id: row.id,
    userId: row.userId,
    operation: parsed.data as SyncOperation,
    attempts: row.attempts,
    lastError: row.lastError,
    revision: row.revision,
  };
}
