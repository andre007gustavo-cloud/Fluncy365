import type { SessionPlan } from "@/domain/entities/session";

export interface GenerateDailySession {
  execute(userId: string, date: Date): Promise<SessionPlan>;
}
