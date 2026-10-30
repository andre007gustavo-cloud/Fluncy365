import { describe, expectTypeOf, it } from "vitest";
import type { SessionPlan } from "@/domain/entities/session";
import type { CourseId } from "@/domain/value-objects/course-id";
import type { GenerateDailySession } from "./generate-daily-session";

describe("contrato GenerateDailySession", () => {
  it("mantem a assinatura de execute estavel", () => {
    expectTypeOf<GenerateDailySession["execute"]>().parameters.toEqualTypeOf<
      [string, CourseId, Date]
    >();
    expectTypeOf<GenerateDailySession["execute"]>().returns.toEqualTypeOf<Promise<SessionPlan>>();
  });
});
