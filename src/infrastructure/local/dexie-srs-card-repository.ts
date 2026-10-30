import Dexie from "dexie";
import type { SrsCard } from "@/domain/entities/srs-card";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { SrsCardRepositoryPort } from "@/domain/ports/student-repository.port";
import type { LocalDatabase, LocalSrsCard } from "./local-db";
import { OfflineQueue } from "./offline-queue";

export class DexieSrsCardRepository implements SrsCardRepositoryPort {
  private readonly queue: OfflineQueue;

  constructor(
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {
    this.queue = new OfflineQueue(db, clock);
  }

  async listAll(userId: string): Promise<readonly SrsCard[]> {
    const rows = await this.db.srsCards.where("userId").equals(userId).toArray();
    return rows.map(toCard);
  }

  async listDue(userId: string, now: Date, limit: number): Promise<readonly SrsCard[]> {
    if (limit <= 0) return [];
    const rows = await this.db.srsCards
      .where("[userId+dueAt]")
      .between([userId, Dexie.minKey], [userId, now.getTime()], true, true)
      .limit(limit)
      .toArray();
    return rows.map(toCard);
  }

  async upsertMany(userId: string, cards: readonly SrsCard[]): Promise<void> {
    await this.db.transaction("rw", this.db.srsCards, this.db.outbox, async () => {
      await this.db.srsCards.bulkPut(this.toRows(userId, cards));
      for (const card of cards) {
        await this.queue.enqueue(userId, { kind: "srsCards.upsert", payload: card });
      }
    });
  }

  /** Grava dados vindos do servidor (pull) sem enfileirar para reenvio. */
  async applyRemote(userId: string, cards: readonly SrsCard[]): Promise<void> {
    await this.db.srsCards.bulkPut(this.toRows(userId, cards));
  }

  private toRows(userId: string, cards: readonly SrsCard[]): LocalSrsCard[] {
    const updatedAt = this.clock.now().getTime();
    return cards.map((card) => ({
      id: card.id,
      userId,
      front: card.front,
      back: card.back,
      type: card.type,
      ease: card.ease,
      intervalDays: card.intervalDays,
      dueAt: card.dueAt.getTime(),
      lapses: card.lapses,
      sourceLessonId: card.sourceLessonId,
      updatedAt,
    }));
  }
}

function toCard(row: LocalSrsCard): SrsCard {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    type: row.type,
    ease: row.ease,
    intervalDays: row.intervalDays,
    dueAt: new Date(row.dueAt),
    lapses: row.lapses,
    sourceLessonId: row.sourceLessonId,
  };
}
