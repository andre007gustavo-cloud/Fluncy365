import type { SrsCard } from "@/domain/entities/srs-card";
import type { StudentModel } from "@/domain/entities/student";
import { MONTHLY_SHIELDS, type Streak } from "@/domain/entities/streak";
import type { ClockPort } from "@/domain/ports/clock.port";
import type {
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
} from "@/domain/ports/student-repository.port";
import type { CourseId } from "@/domain/value-objects/course-id";
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

/** Semente dos fakes: curso -> usuario -> dado. */
export type CourseSeed<T> = Readonly<Record<CourseId, Readonly<Record<string, T>>>>;

function scopeKey(userId: string, courseId: CourseId): string {
  return `${courseId}:${userId}`;
}

function seedMap<T>(seed: CourseSeed<T>): Map<string, T> {
  const entries: [string, T][] = [];
  for (const [courseId, byUser] of Object.entries(seed)) {
    for (const [userId, value] of Object.entries(byUser)) {
      entries.push([scopeKey(userId, courseId), value]);
    }
  }
  return new Map(entries);
}

export class InMemorySrsCardRepository implements SrsCardRepositoryPort {
  private readonly byScope: Map<string, readonly SrsCard[]>;

  constructor(seed: CourseSeed<readonly SrsCard[]> = {}) {
    this.byScope = seedMap(seed);
  }

  async listAll(userId: string, courseId: CourseId): Promise<readonly SrsCard[]> {
    return [...(this.byScope.get(scopeKey(userId, courseId)) ?? [])];
  }

  async listDue(
    userId: string,
    courseId: CourseId,
    now: Date,
    limit: number,
  ): Promise<readonly SrsCard[]> {
    const all = await this.listAll(userId, courseId);
    return all.filter((card) => isDue(card, now)).slice(0, Math.max(0, limit));
  }

  async upsertMany(userId: string, courseId: CourseId, cards: readonly SrsCard[]): Promise<void> {
    const key = scopeKey(userId, courseId);
    const merged = new Map((this.byScope.get(key) ?? []).map((card) => [card.id, card]));
    for (const card of cards) merged.set(card.id, card);
    this.byScope.set(key, [...merged.values()]);
  }
}

export const EMPTY_STREAK: Streak = {
  current: 0,
  best: 0,
  shieldsLeft: MONTHLY_SHIELDS,
  lastDay: null,
};

export class InMemoryStreakRepository implements StreakRepositoryPort {
  private readonly byScope: Map<string, Streak>;

  constructor(seed: CourseSeed<Streak> = {}) {
    this.byScope = seedMap(seed);
  }

  async load(userId: string, courseId: CourseId): Promise<Streak> {
    return this.byScope.get(scopeKey(userId, courseId)) ?? EMPTY_STREAK;
  }

  async save(userId: string, courseId: CourseId, streak: Streak): Promise<void> {
    this.byScope.set(scopeKey(userId, courseId), streak);
  }
}

export class InMemoryStudentModelRepository implements StudentModelRepositoryPort {
  private readonly byScope: Map<string, StudentModel>;

  constructor(seed: CourseSeed<StudentModel> = {}) {
    this.byScope = seedMap(seed);
  }

  async load(userId: string, courseId: CourseId): Promise<StudentModel | null> {
    return this.byScope.get(scopeKey(userId, courseId)) ?? null;
  }

  async save(model: StudentModel, courseId: CourseId): Promise<void> {
    this.byScope.set(scopeKey(model.userId, courseId), model);
  }
}
