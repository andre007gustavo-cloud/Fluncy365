import type {
  ErrorLogRepositoryPort,
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
  TopicMasteryRepositoryPort,
} from "@/domain/ports/student-repository.port";
import type { LocalDatabase } from "./local-db";
import type { DexieErrorLogRepository } from "./dexie-error-log-repository";
import type { DexieSrsCardRepository } from "./dexie-srs-card-repository";
import type { DexieStreakRepository } from "./dexie-streak-repository";
import type { DexieStudentModelRepository } from "./dexie-student-model-repository";
import type { DexieTopicMasteryRepository } from "./dexie-topic-mastery-repository";
import {
  pendingKey,
  type OfflineQueue,
  type PendingQueue,
  type SyncOperation,
} from "./offline-queue";

export interface RemoteRepositories {
  srsCards: SrsCardRepositoryPort;
  studentModel: StudentModelRepositoryPort;
  streak: StreakRepositoryPort;
  topicMastery: TopicMasteryRepositoryPort;
  errorLog: ErrorLogRepositoryPort;
}

export interface LocalRepositories {
  srsCards: DexieSrsCardRepository;
  studentModel: DexieStudentModelRepository;
  streak: DexieStreakRepository;
  topicMastery: DexieTopicMasteryRepository;
  errorLog: DexieErrorLogRepository;
}

interface PushResult {
  pushed: number;
  /** Primeira falha de envio (a ordem estrita para a fila aqui). */
  error: string | null;
  invalid: string[];
}

export interface SyncReport {
  /** Operacoes enviadas ao servidor (somadas entre as rodadas); uma editada durante o envio segue na fila. */
  pushed: number;
  /** Registros do servidor gravados localmente; null quando o pull nao rodou. */
  pulled: number | null;
  /** Primeira falha (envio, linha corrompida ou pull); null quando tudo deu certo. */
  error: string | null;
}

/** O port nao tem "listar tudo" para erros; este teto cobre qualquer aluno real. */
const ERROR_LOG_PULL_LIMIT = 1000;

interface Execution {
  rerun: boolean;
  promise: Promise<SyncReport>;
}

const EMPTY_REPORT: SyncReport = { pushed: 0, pulled: null, error: null };

export class SyncEngine {
  private readonly running = new Map<string, Execution>();

  constructor(
    private readonly db: LocalDatabase,
    private readonly queue: OfflineQueue,
    private readonly remote: RemoteRepositories,
    private readonly local: LocalRepositories,
  ) {}

  /**
   * Chamadas durante uma execucao em curso nao abrem uma segunda em paralelo: marcam
   * uma nova rodada, feita ao terminar a atual, e recebem a promise do conjunto.
   * Assim um evento "online" que chega no meio de um sync que vai falhar nao se perde.
   * O pull so roda se o envio nao falhou: com falha no envio o servidor provavelmente
   * esta inacessivel e a ordem das edicoes pendentes importa mais. Mesmo assim o pull
   * nunca sobrescreve entidades com operacao pendente.
   */
  sync(userId: string): Promise<SyncReport> {
    const current = this.running.get(userId);
    if (current) {
      current.rerun = true;
      return current.promise;
    }

    const execution: Execution = { rerun: false, promise: Promise.resolve(EMPTY_REPORT) };
    execution.promise = this.syncUntilSettled(userId, execution).finally(() =>
      this.running.delete(userId),
    );
    this.running.set(userId, execution);
    return execution.promise;
  }

  private async syncUntilSettled(userId: string, execution: Execution): Promise<SyncReport> {
    let report: SyncReport;
    let pushedBefore = 0;
    do {
      execution.rerun = false;
      report = await this.runSync(userId);
      report = { ...report, pushed: report.pushed + pushedBefore };
      pushedBefore = report.pushed;
    } while (execution.rerun);
    return report;
  }

  /**
   * Envia em ordem e para na primeira falha, preservando a ordem das edicoes.
   * Linhas invalidas da fila nao sao enviadas nem apagadas: voltam em `invalid`.
   */
  async push(userId: string): Promise<PushResult> {
    let pending: PendingQueue;
    try {
      pending = await this.queue.pending(userId);
    } catch (error) {
      return { pushed: 0, error: messageOf(error), invalid: [] };
    }
    const { operations, invalid } = pending;
    const invalidMessages = invalid.map((op) => op.message);

    let pushed = 0;
    for (const queued of operations) {
      try {
        await this.dispatch(userId, queued.operation);
      } catch (error) {
        const message = messageOf(error);
        await this.queue.markFailed(queued.id, message);
        return { pushed, error: message, invalid: invalidMessages };
      }
      await this.queue.ack(queued.id, queued.revision);
      pushed += 1;
    }
    return { pushed, error: null, invalid: invalidMessages };
  }

  /**
   * Le tudo do servidor primeiro (rede) e so depois abre UMA transacao local que
   * confere a fila e grava: assim nenhuma edicao do aluno cai entre a checagem
   * de pendencias e a gravacao, e o pull e atomico.
   */
  async pull(userId: string): Promise<number> {
    const cards = await this.remote.srsCards.listAll(userId);
    const masteries = await this.remote.topicMastery.list(userId);
    const errors = await this.remote.errorLog.listRecent(userId, ERROR_LOG_PULL_LIMIT);
    const model = await this.remote.studentModel.load(userId);
    const streak = await this.remote.streak.load(userId);

    const { db } = this;
    const tables = [
      db.srsCards,
      db.topicMastery,
      db.errorLog,
      db.studentModels,
      db.streaks,
      db.outbox,
    ];
    return db.transaction("rw", tables, async () => {
      const pending = await this.queue.pendingKeys(userId);
      const isFree = (kind: SyncOperation["kind"], entityKey: string) =>
        !pending.has(pendingKey(kind, entityKey));

      const freeCards = cards.filter((c) => isFree("srsCards.upsert", c.id));
      const freeMasteries = masteries.filter((m) => isFree("topicMastery.upsert", m.topicId));
      const freeErrors = errors.filter((e) => isFree("errorLog.record", e.code));
      await this.local.srsCards.applyRemote(userId, freeCards);
      await this.local.topicMastery.applyRemote(userId, freeMasteries);
      await this.local.errorLog.applyRemote(userId, freeErrors);

      let applied = freeCards.length + freeMasteries.length + freeErrors.length;
      if (model && isFree("studentModel.save", "self")) {
        await this.local.studentModel.applyRemote(model);
        applied += 1;
      }
      if (streak.lastDay !== null && isFree("streak.save", "self")) {
        await this.local.streak.applyRemote(userId, streak);
        applied += 1;
      }
      return applied;
    });
  }

  private async runSync(userId: string): Promise<SyncReport> {
    const { pushed, error, invalid } = await this.push(userId);
    if (error !== null) return { pushed, pulled: null, error: [error, ...invalid].join(" | ") };

    const invalidError = invalid.length > 0 ? invalid.join(" | ") : null;
    try {
      return { pushed, pulled: await this.pull(userId), error: invalidError };
    } catch (pullError) {
      return {
        pushed,
        pulled: null,
        error: [messageOf(pullError), ...invalid].join(" | "),
      };
    }
  }

  private async dispatch(userId: string, operation: SyncOperation): Promise<void> {
    switch (operation.kind) {
      case "srsCards.upsert":
        return this.remote.srsCards.upsertMany(userId, [operation.payload]);
      case "studentModel.save":
        return this.remote.studentModel.save(operation.payload);
      case "streak.save":
        return this.remote.streak.save(userId, operation.payload);
      case "topicMastery.upsert":
        return this.remote.topicMastery.upsert(userId, operation.payload);
      case "errorLog.record":
        return this.remote.errorLog.record(userId, operation.payload);
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
