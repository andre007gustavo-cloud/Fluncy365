import type { JwRef, Lesson, UnitSpec } from "../entities/lesson";
import type { CourseId } from "../value-objects/course-id";

export interface ContentRepositoryPort {
  findUnit(courseId: CourseId, unitId: string): Promise<UnitSpec | null>;
  findLesson(courseId: CourseId, unitId: string, dayIndex: number): Promise<Lesson | null>;
  saveLesson(courseId: CourseId, lesson: Lesson): Promise<void>;
  listJwRefs(courseId: CourseId, unitId: string): Promise<readonly JwRef[]>;
}
