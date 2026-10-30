import type { Streak } from "@/domain/entities/streak";
import type { CourseId } from "@/domain/value-objects/course-id";
import type { ClockPort } from "@/domain/ports/clock.port";
import type {
  SrsCardRepositoryPort,
  StreakRepositoryPort,
  StudentModelRepositoryPort,
} from "@/domain/ports/student-repository.port";
import { selectDueCards } from "@/domain/services/select-due-cards";
import { DAILY_REVIEW_LIMIT } from "@/domain/services/srs-scheduler";
import type { LevelsBySkill } from "@/domain/entities/student";

export interface TodayOverview {
  readonly day: string;
  readonly dueToday: number;
  readonly extraQueue: number;
  readonly streak: Streak;
  readonly levels: LevelsBySkill | null;
  readonly vocabSize: number;
}

export interface GetTodayOverviewDeps {
  readonly clock: ClockPort;
  readonly srsCards: SrsCardRepositoryPort;
  readonly streaks: StreakRepositoryPort;
  readonly studentModels: StudentModelRepositoryPort;
}

/**
 * Fatia vertical de exemplo da Fase 0: alimenta o cartao "hoje" do painel.
 * Serve de molde para os casos de uso reais da Fase 1 - orquestra ports,
 * nunca contem regra de negocio (a regra vive em selectDueCards).
 */
export class GetTodayOverview {
  constructor(private readonly deps: GetTodayOverviewDeps) {}

  async execute(userId: string, courseId: CourseId): Promise<TodayOverview> {
    const now = this.deps.clock.now();

    const [cards, streak, model] = await Promise.all([
      this.deps.srsCards.listAll(userId, courseId),
      this.deps.streaks.load(userId, courseId),
      this.deps.studentModels.load(userId, courseId),
    ]);

    const { selected, overflow } = selectDueCards(cards, now, DAILY_REVIEW_LIMIT);

    return {
      day: this.deps.clock.today(),
      dueToday: selected.length,
      extraQueue: overflow,
      streak,
      levels: model?.levels ?? null,
      vocabSize: model?.vocabSize ?? 0,
    };
  }
}
