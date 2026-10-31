import type { JwRef, Lesson, UnitSpec } from "@/domain/entities/lesson";
import type { CourseId } from "@/domain/value-objects/course-id";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { ContentRepositoryPort } from "@/domain/ports/content-repository.port";
import { lessonSchema, unitSchema } from "../supabase/content-schemas";
import type { LocalDatabase } from "./local-db";
import { assertOfflineCourse } from "./offline-course";

/**
 * Remoto primeiro; cada leitura bem-sucedida vira cache no Dexie. Se o remoto
 * falha, devolve o cache; se o remoto responde que nao existe (despublicado), o cache e apagado; sem cache (ou cache invalido), relanca o erro original.
 * saveLesson e listJwRefs nao passam pelo cache: gravar e sempre do remoto e as
 * referencias JW ainda nao tem tabela local.
 */
export class CachedContentRepository implements ContentRepositoryPort {
  constructor(
    private readonly remote: ContentRepositoryPort,
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {}

  async findUnit(courseId: CourseId, unitId: string): Promise<UnitSpec | null> {
    assertOfflineCourse(courseId);
    let unit: UnitSpec | null;
    try {
      unit = await this.remote.findUnit(courseId, unitId);
    } catch (error) {
      const cached = await this.db.units.get(unitId);
      const parsed = unitSchema.safeParse(cached?.data);
      if (parsed.success) return parsed.data;
      throw error;
    }
    if (unit) {
      const cachedUnit = unit;
      await this.tryCache(`unidade ${cachedUnit.id}`, () =>
        this.db.units.put({
          id: cachedUnit.id,
          data: cachedUnit,
          updatedAt: this.clock.now().getTime(),
        }),
      );
    } else {
      await this.tryCache(`remocao da unidade ${unitId}`, () => this.db.units.delete(unitId));
    }
    return unit;
  }

  async findLesson(courseId: CourseId, unitId: string, dayIndex: number): Promise<Lesson | null> {
    assertOfflineCourse(courseId);
    let lesson: Lesson | null;
    try {
      lesson = await this.remote.findLesson(courseId, unitId, dayIndex);
    } catch (error) {
      const cached = await this.db.lessons
        .where("[unitId+dayIndex]")
        .equals([unitId, dayIndex])
        .first();
      const parsed = lessonSchema.safeParse(cached?.data);
      if (parsed.success) return parsed.data;
      throw error;
    }
    if (lesson) {
      const cachedLesson = lesson;
      await this.tryCache(`licao ${cachedLesson.id}`, () => this.cacheLesson(cachedLesson));
    } else {
      await this.tryCache(`remocao da licao ${unitId}/${dayIndex}`, () =>
        this.db.lessons.where("[unitId+dayIndex]").equals([unitId, dayIndex]).delete(),
      );
    }
    return lesson;
  }

  saveLesson(courseId: CourseId, lesson: Lesson): Promise<void> {
    return this.remote.saveLesson(courseId, lesson);
  }

  listJwRefs(courseId: CourseId, unitId: string): Promise<readonly JwRef[]> {
    return this.remote.listJwRefs(courseId, unitId);
  }

  /** Falha ao gravar o cache nao pode derrubar uma leitura remota que deu certo. */
  private async tryCache(what: string, write: () => Promise<unknown>): Promise<void> {
    try {
      await write();
    } catch (error) {
      console.error(`Nao foi possivel guardar ${what} para uso offline:`, error);
    }
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
