import type { TopicMastery } from "@/domain/entities/student";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { TopicMasteryRepositoryPort } from "@/domain/ports/student-repository.port";
import type { LocalDatabase, LocalTopicMastery } from "./local-db";
import { OfflineQueue } from "./offline-queue";

export class DexieTopicMasteryRepository implements TopicMasteryRepositoryPort {
  private readonly queue: OfflineQueue;

  constructor(
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {
    this.queue = new OfflineQueue(db, clock);
  }

  async list(userId: string): Promise<readonly TopicMastery[]> {
    const rows = await this.db.topicMastery.where("userId").equals(userId).toArray();
    return rows.map(toMastery);
  }

  async upsert(userId: string, mastery: TopicMastery): Promise<void> {
    await this.db.transaction("rw", this.db.topicMastery, this.db.outbox, async () => {
      await this.db.topicMastery.put(this.toRow(userId, mastery));
      await this.queue.enqueue(userId, { kind: "topicMastery.upsert", payload: mastery });
    });
  }

  /** Grava dados vindos do servidor (pull) sem enfileirar para reenvio. */
  async applyRemote(userId: string, masteries: readonly TopicMastery[]): Promise<void> {
    await this.db.topicMastery.bulkPut(masteries.map((m) => this.toRow(userId, m)));
  }

  private toRow(userId: string, mastery: TopicMastery): LocalTopicMastery {
    return {
      userId,
      topicId: mastery.topicId,
      accuracy: mastery.accuracy,
      attempts: mastery.attempts,
      sessions: mastery.sessions,
      lastSeen: mastery.lastSeen?.getTime() ?? null,
      status: mastery.status,
      updatedAt: this.clock.now().getTime(),
    };
  }
}

function toMastery(row: LocalTopicMastery): TopicMastery {
  return {
    topicId: row.topicId,
    accuracy: row.accuracy,
    attempts: row.attempts,
    sessions: row.sessions,
    lastSeen: row.lastSeen === null ? null : new Date(row.lastSeen),
    status: row.status,
  };
}
