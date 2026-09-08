import type { JwRef, Lesson, UnitSpec } from "../entities/lesson";

export interface ContentRepositoryPort {
  findUnit(unitId: string): Promise<UnitSpec | null>;
  findLesson(unitId: string, dayIndex: number): Promise<Lesson | null>;
  saveLesson(lesson: Lesson): Promise<void>;
  listJwRefs(unitId: string): Promise<readonly JwRef[]>;
}
