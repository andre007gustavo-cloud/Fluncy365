import { createStreak, type Streak } from "@/domain/entities/streak";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { StreakRepositoryPort } from "@/domain/ports/student-repository.port";
import type { LocalDatabase, LocalStreak } from "./local-db";
import { OfflineQueue } from "./offline-queue";

export class DexieStreakRepository implements StreakRepositoryPort {
  private readonly queue: OfflineQueue;

  constructor(
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {
    this.queue = new OfflineQueue(db, clock);
  }

  async load(userId: string): Promise<Streak> {
    const row = await this.db.streaks.get(userId);
    return row ? toStreak(row) : createStreak();
  }

  async save(userId: string, streak: Streak): Promise<void> {
    await this.db.transaction("rw", this.db.streaks, this.db.outbox, async () => {
      await this.db.streaks.put(this.toRow(userId, streak));
      await this.queue.enqueue(userId, { kind: "streak.save", payload: streak });
    });
  }

  /** Grava dados vindos do servidor (pull) sem enfileirar para reenvio. */
  async applyRemote(userId: string, streak: Streak): Promise<void> {
    await this.db.streaks.put(this.toRow(userId, streak));
  }

  private toRow(userId: string, streak: Streak): LocalStreak {
    return {
      userId,
      current: streak.current,
      best: streak.best,
      shieldsLeft: streak.shieldsLeft,
      lastDay: streak.lastDay,
      updatedAt: this.clock.now().getTime(),
    };
  }
}

function toStreak(row: LocalStreak): Streak {
  return {
    current: row.current,
    best: row.best,
    shieldsLeft: row.shieldsLeft,
    lastDay: row.lastDay,
  };
}
