import type { TodayOverview } from "@/application/get-today-overview";
import { cefrLabel } from "@/domain/value-objects/cefr-level";
import { SKILLS } from "@/domain/value-objects/skill";
import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  ProgressBar,
} from "@/presentation/components/ui";
import { pt } from "@/presentation/i18n/pt";
import { DAILY_REVIEW_LIMIT } from "@/domain/services/srs-scheduler";

export interface TodayScreenProps {
  overview: TodayOverview;
  displayName: string;
}

/**
 * Componente de apresentacao puro: recebe o resultado do caso de uso pronto
 * e so exibe. Nenhuma regra de negocio aqui (principio S).
 */
export function TodayScreen({ overview, displayName }: TodayScreenProps) {
  const { streak, dueToday, extraQueue, levels, vocabSize } = overview;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10">
      <header className="animate-fade-in-up">
        <p className="text-sm text-muted">
          {pt.today.greeting}
          {displayName ? `, ${displayName}` : ""}.
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{pt.today.title}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col justify-between">
          <CardTitle className="text-4xl tabular-nums text-accent">{streak.current}</CardTitle>
          <CardDescription>{pt.today.streak}</CardDescription>
          <p className="mt-3 text-xs text-muted">
            {streak.shieldsLeft} {pt.today.shields}
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardTitle className="text-4xl tabular-nums text-brand">{vocabSize}</CardTitle>
          <CardDescription>{pt.today.vocabulary}</CardDescription>
        </Card>
      </div>

      <Card>
        <ProgressBar
          value={dueToday}
          max={DAILY_REVIEW_LIMIT}
          label={`${dueToday} ${pt.today.reviewsDue}`}
          showValue
        />
        {dueToday === 0 ? <CardDescription>{pt.today.noReviews}</CardDescription> : null}
        {extraQueue > 0 ? (
          <CardDescription>
            +{extraQueue} {pt.today.extraQueue}
          </CardDescription>
        ) : null}
      </Card>

      {levels ? (
        <Card>
          <CardTitle className="mb-4">{pt.today.levels}</CardTitle>
          <div className="flex flex-col gap-4">
            {SKILLS.map((skill) => (
              <ProgressBar
                key={skill}
                value={levels[skill]}
                max={6}
                label={`${pt.skills[skill]} — ${cefrLabel(levels[skill])}`}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button size="lg" disabled title={pt.today.comingSoon}>
          {pt.today.startSession}
        </Button>
        <p className="text-center text-xs text-muted">{pt.today.comingSoon}</p>
      </div>
    </div>
  );
}
