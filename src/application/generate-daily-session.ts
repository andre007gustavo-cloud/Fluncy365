import type { SessionPlan } from "@/domain/entities/session";
import type { CourseId } from "@/domain/value-objects/course-id";

export interface GenerateDailySession {
  execute(userId: string, courseId: CourseId, date: Date): Promise<SessionPlan>;
}
