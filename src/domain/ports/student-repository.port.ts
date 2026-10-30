import type { SrsCard } from "../entities/srs-card";
import type { StudentError, StudentModel, TopicMastery } from "../entities/student";
import type { Streak } from "../entities/streak";
import type { CourseId } from "../value-objects/course-id";

/** Ports pequenos e especificos (principio I do SOLID). */
export interface StudentModelRepositoryPort {
  load(userId: string, courseId: CourseId): Promise<StudentModel | null>;
  save(model: StudentModel, courseId: CourseId): Promise<void>;
}

export interface SrsCardRepositoryPort {
  listAll(userId: string, courseId: CourseId): Promise<readonly SrsCard[]>;
  listDue(
    userId: string,
    courseId: CourseId,
    now: Date,
    limit: number,
  ): Promise<readonly SrsCard[]>;
  upsertMany(userId: string, courseId: CourseId, cards: readonly SrsCard[]): Promise<void>;
}

export interface TopicMasteryRepositoryPort {
  list(userId: string, courseId: CourseId): Promise<readonly TopicMastery[]>;
  upsert(userId: string, courseId: CourseId, mastery: TopicMastery): Promise<void>;
}

export interface ErrorLogRepositoryPort {
  listRecent(userId: string, courseId: CourseId, limit: number): Promise<readonly StudentError[]>;
  record(userId: string, courseId: CourseId, error: StudentError): Promise<void>;
}

export interface StreakRepositoryPort {
  load(userId: string, courseId: CourseId): Promise<Streak>;
  save(userId: string, courseId: CourseId, streak: Streak): Promise<void>;
}
