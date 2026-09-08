import type { SrsCard } from "../entities/srs-card";
import type { StudentError, StudentModel, TopicMastery } from "../entities/student";
import type { Streak } from "../entities/streak";

/** Ports pequenos e especificos (principio I do SOLID). */
export interface StudentModelRepositoryPort {
  load(userId: string): Promise<StudentModel | null>;
  save(model: StudentModel): Promise<void>;
}

export interface SrsCardRepositoryPort {
  listAll(userId: string): Promise<readonly SrsCard[]>;
  listDue(userId: string, now: Date, limit: number): Promise<readonly SrsCard[]>;
  upsertMany(userId: string, cards: readonly SrsCard[]): Promise<void>;
}

export interface TopicMasteryRepositoryPort {
  list(userId: string): Promise<readonly TopicMastery[]>;
  upsert(userId: string, mastery: TopicMastery): Promise<void>;
}

export interface ErrorLogRepositoryPort {
  listRecent(userId: string, limit: number): Promise<readonly StudentError[]>;
  record(userId: string, error: StudentError): Promise<void>;
}

export interface StreakRepositoryPort {
  load(userId: string): Promise<Streak>;
  save(userId: string, streak: Streak): Promise<void>;
}
