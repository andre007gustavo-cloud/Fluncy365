import type { JwRef, Lesson, UnitSpec } from "@/domain/entities/lesson";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { ContentRepositoryPort } from "@/domain/ports/content-repository.port";
import { lessonSchema, unitSchema } from "../supabase/content-schemas";
import type { LocalDatabase } from "./local-db";

/**
 * Remoto primeiro; cada leitura bem-sucedida vira cache no Dexie. Se o remoto
 * falha, devolve o cache; sem cache (ou cache invalido), relanca o erro original.
 * saveLesson e listJwRefs nao passam pelo cache: gravar e sempre do remoto e as
 * referencias JW ainda nao tem tabela local.
 */
export class CachedContentRepository implements ContentRepositoryPort {
  constructor(
    private readonly remote: ContentRepositoryPort,
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {}

  async findUnit(unitId: string): Promise<UnitSpec | null> {
    let unit: UnitSpec | null;
    try {
      unit = await this.remote.findUnit(unitId);
    } catch (error) {
      const cached = await this.db.units.get(unitId);
      const parsed = unitSchema.safeParse(cached?.data);
      if (parsed.success) return parsed.data;
      throw error;
    }
    if (unit) {
      await this.db.units.put({ id: unit.id, data: unit, updatedAt: this.clock.now().getTime() });
    }
    return unit;
  }

  async findLesson(unitId: string, dayIndex: number): Promise<Lesson | null> {
    let lesson: Lesson | null;
    try {
      lesson = await this.remote.findLesson(unitId, dayIndex);
    } catch (error) {
      const cached = await this.db.lessons
        .where("[unitId+dayIndex]")
        .equals([unitId, dayIndex])
        .first();
      const parsed = lessonSchema.safeParse(cached?.data);
      if (parsed.success) return parsed.data;
      throw error;
    }
    if (lesson) await this.cacheLesson(lesson);
    return lesson;
  }

  saveLesson(lesson: Lesson): Promise<void> {
    return this.remote.saveLesson(lesson);
  }

  listJwRefs(unitId: string): Promise<readonly JwRef[]> {
    return this.remote.listJwRefs(unitId);
  }

  private async cacheLesson(lesson: Lesson): Promise<void> {
    await this.db.transaction("rw", this.db.lessons, async () => {
      await this.db.lessons
        .where("[unitId+dayIndex]")
        .equals([lesson.unitId, lesson.dayIndex])
        .delete();
      await this.db.lessons.put({
        id: lesson.id,
        unitId: lesson.unitId,
        dayIndex: lesson.dayIndex,
        data: lesson,
        updatedAt: this.clock.now().getTime(),
      });
    });
  }
}
