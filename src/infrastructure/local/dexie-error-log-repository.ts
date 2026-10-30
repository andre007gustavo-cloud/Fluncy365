import type { StudentError } from "@/domain/entities/student";
import type { ClockPort } from "@/domain/ports/clock.port";
import type { ErrorLogRepositoryPort } from "@/domain/ports/student-repository.port";
import { isSkill } from "@/domain/value-objects/skill";
import type { LocalDatabase, LocalErrorLog } from "./local-db";
import { OfflineQueue } from "./offline-queue";

/** `record` grava o registro completo do codigo: quem chama ja traz a contagem atualizada. */
export class DexieErrorLogRepository implements ErrorLogRepositoryPort {
  private readonly queue: OfflineQueue;

  constructor(
    private readonly db: LocalDatabase,
    private readonly clock: ClockPort,
  ) {
    this.queue = new OfflineQueue(db, clock);
  }

  async listRecent(userId: string, limit: number): Promise<readonly StudentError[]> {
    if (limit <= 0) return [];
    const rows = await this.db.errorLog
      .where("[userId+lastAt]")
      .between([userId, -Infinity], [userId, Infinity])
      .reverse()
      .limit(limit)
      .toArray();
    return rows.map(toError);
  }

  async record(userId: string, error: StudentError): Promise<void> {
    await this.db.transaction("rw", this.db.errorLog, this.db.outbox, async () => {
      await this.db.errorLog.put(this.toRow(userId, error));
      await this.queue.enqueue(userId, { kind: "errorLog.record", payload: error });
    });
  }

  /** Grava dados vindos do servidor (pull) sem enfileirar para reenvio. */
  async applyRemote(userId: string, errors: readonly StudentError[]): Promise<void> {
    await this.db.errorLog.bulkPut(errors.map((e) => this.toRow(userId, e)));
  }

  private toRow(userId: string, error: StudentError): LocalErrorLog {
    return {
      userId,
      code: error.code,
      example: error.example,
      count: error.count,
      lastAt: error.lastAt.getTime(),
      skill: error.skill,
      updatedAt: this.clock.now().getTime(),
    };
  }
}

function toError(row: LocalErrorLog): StudentError {
  if (!isSkill(row.skill)) {
    throw new Error(`Registro local de erro "${row.code}" com skill invalida: ${row.skill}`);
  }
  return {
    code: row.code,
    example: row.example,
    count: row.count,
    lastAt: new Date(row.lastAt),
    skill: row.skill,
  };
}
