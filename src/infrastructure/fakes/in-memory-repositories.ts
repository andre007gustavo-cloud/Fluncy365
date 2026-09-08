import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentModel } from "@/domain/entities/student";
import { MONTHLY_SHIELDS, type Streak } from "@/domain/entities/streak";
import type { ClockPort } from "@/domain/ports/clock.port";
import type {
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
} from "@/domain/ports/student-repository.port";
import { isDue } from "@/domain/entities/srs-card";

/** Relogio fixo: e o que torna o SRS testavel sem esperar dias passarem. */
export class FixedClock implements ClockPort {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  today(): string {
    return this.current.toISOString().slice(0, 10);
  }

  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

export class InMemorySrsCardRepository implements SrsCardRepositoryPort {
  private readonly byUser = new Map<string, SrsCard[]>();

  constructor(seed: Readonly<Record<string, readonly SrsCard[]>> = {}) {
    for (const [userId, cards] of Object.entries(seed)) {
      this.byUser.set(userId, [...cards]);
    }
  }

  async listAll(userId: string): Promise<readonly SrsCard[]> {
    return [...(this.byUser.get(userId) ?? [])];
  }

  async listDue(userId: string, now: Date, limit: number): Promise<readonly SrsCard[]> {
    const all = await this.listAll(userId);
    return all.filter((card) => isDue(card, now)).slice(0, Math.max(0, limit));
  }

  async upsertMany(userId: string, cards: readonly SrsCard[]): Promise<void> {
    const current = this.byUser.get(userId) ?? [];
    const merged = new Map(current.map((card) => [card.id, card]));
    for (const card of cards) merged.set(card.id, card);
    this.byUser.set(userId, [...merged.values()]);
  }
}

export const EMPTY_STREAK: Streak = {
  current: 0,
  best: 0,
  shieldsLeft: MONTHLY_SHIELDS,
  lastDay: null,
};

export class InMemoryStreakRepository implements StreakRepositoryPort {
  private readonly byUser = new Map<string, Streak>();

  constructor(seed: Readonly<Record<string, Streak>> = {}) {
    for (const [userId, streak] of Object.entries(seed)) this.byUser.set(userId, streak);
  }

  async load(userId: string): Promise<Streak> {
    return this.byUser.get(userId) ?? EMPTY_STREAK;
  }

  async save(userId: string, streak: Streak): Promise<void> {
    this.byUser.set(userId, streak);
  }
}

export class InMemoryStudentModelRepository implements StudentModelRepositoryPort {
  private readonly byUser = new Map<string, StudentModel>();

  constructor(seed: Readonly<Record<string, StudentModel>> = {}) {
    for (const [userId, model] of Object.entries(seed)) this.byUser.set(userId, model);
  }

  async load(userId: string): Promise<StudentModel | null> {
    return this.byUser.get(userId) ?? null;
  }

  async save(model: StudentModel): Promise<void> {
    this.byUser.set(model.userId, model);
  }
}
