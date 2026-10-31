import type { CourseId } from "@/domain/value-objects/course-id";
import type { SyncReport } from "./sync-engine";

export interface Syncer {
  sync(userId: string, courseId: CourseId): Promise<SyncReport>;
}

function logSyncFailure(error: unknown): void {
  console.error("Falha inesperada na sincronizacao automatica:", error);
}

/**
 * Sincroniza na partida e a cada evento "online". Chamadas sobrepostas sao
 * absorvidas pela trava do SyncEngine. Devolve a funcao que cancela o listener.
 */
export function startAutoSync(
  engine: Syncer,
  userId: string,
  courseId: CourseId,
  target: EventTarget,
  onReport?: (report: SyncReport) => void,
  onError: (error: unknown) => void = logSyncFailure,
): () => void {
  const run = () => {
    engine
      .sync(userId, courseId)
      .then((report) => onReport?.(report))
      .catch(onError);
  };

  target.addEventListener("online", run);
  run();
  return () => target.removeEventListener("online", run);
}
