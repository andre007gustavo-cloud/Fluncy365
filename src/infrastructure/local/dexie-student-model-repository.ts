import type { StudentModel } from "@/domain/entities/student";
import type { CourseId } from "@/domain/value-objects/course-id";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { StudentModelRepositoryPort } from "@/domain/ports/student-repository.port";
import type { LocalDatabase, LocalStudentModel } from "./local-db";
import { assertOfflineCourse } from "./offline-course";
import { OfflineQueue } from "./offline-queue";

export class DexieStudentModelRepository implements StudentModelRepositoryPort {
  private readonly queue: OfflineQueue;

  constructor(
    private readonly db: LocalDatabase,
    clock: ClockPort,
  ) {
    this.queue = new OfflineQueue(db, clock);
  }

  async load(userId: string, courseId: CourseId): Promise<StudentModel | null> {
    assertOfflineCourse(courseId);
    const row = await this.db.studentModels.get(userId);
    return row ? toModel(row) : null;
  }

  async save(model: StudentModel, courseId: CourseId): Promise<void> {
    assertOfflineCourse(courseId);
    await this.db.transaction("rw", this.db.studentModels, this.db.outbox, async () => {
      await this.db.studentModels.put(toRow(model));
      await this.queue.enqueue(model.userId, { kind: "studentModel.save", payload: model });
    });
  }

  /** Grava dados vindos do servidor (pull) sem enfileirar para reenvio. */
  async applyRemote(model: StudentModel): Promise<void> {
    await this.db.studentModels.put(toRow(model));
  }
}

function toRow(model: StudentModel): LocalStudentModel {
  return {
    userId: model.userId,
    levels: { ...model.levels },
    vocabSize: model.vocabSize,
    pace: { ...model.pace },
    updatedAt: model.updatedAt.getTime(),
  };
}

function toModel(row: LocalStudentModel): StudentModel {
  return {
    userId: row.userId,
    levels: { ...row.levels },
    vocabSize: row.vocabSize,
    pace: { ...row.pace },
    updatedAt: new Date(row.updatedAt),
  };
}
