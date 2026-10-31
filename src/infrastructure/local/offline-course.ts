import type { CourseId } from "@/domain/value-objects/course-id";

/** O armazenamento local (Dexie) ainda nao separa dados por curso; o offline do vmw fica para uma fase futura. */
const OFFLINE_COURSE_ID: CourseId = "en";

export function assertOfflineCourse(courseId: CourseId): void {
  if (courseId !== OFFLINE_COURSE_ID) {
    throw new Error(
      `O modo offline ainda nao suporta o curso "${courseId}": so o curso "${OFFLINE_COURSE_ID}" tem armazenamento local.`,
    );
  }
}
