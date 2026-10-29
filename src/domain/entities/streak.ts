import { addDays, assertDay, daysBetween, monthOf } from "./streak-calendar";

export const MONTHLY_SHIELDS = 2;

export interface Streak {
  readonly current: number;
  readonly best: number;
  readonly shieldsLeft: number;
  /** Ultimo dia estudado, YYYY-MM-DD no fuso do aluno. */
  readonly lastDay: string | null;
}

type StudiedStreak = Streak & { readonly lastDay: string };

interface Settlement {
  readonly current: number;
  readonly shieldsLeft: number;
}

export function createStreak(): Streak {
  return { current: 0, best: 0, shieldsLeft: MONTHLY_SHIELDS, lastDay: null };
}

function hasLastDay(streak: Streak): streak is StudiedStreak {
  return streak.lastDay !== null;
}

/**
 * Percorre os dias perdidos (lastDay+1 .. throughDay) um a um. Os escudos
 * guardados pertencem ao mes de lastDay e renovam para 2 ao entrar em mes novo.
 * O mes de targetDay tambem renova, para refletir o saldo vigente nele.
 */
function settleMissedDays(
  streak: StudiedStreak,
  throughDay: string,
  targetDay: string,
): Settlement {
  let { current, shieldsLeft } = streak;
  let shieldMonth = monthOf(streak.lastDay);

  for (
    let day = addDays(streak.lastDay, 1);
    daysBetween(day, throughDay) >= 0;
    day = addDays(day, 1)
  ) {
    if (monthOf(day) !== shieldMonth) {
      shieldMonth = monthOf(day);
      shieldsLeft = MONTHLY_SHIELDS;
    }
    if (current === 0) continue;
    if (shieldsLeft > 0) {
      shieldsLeft -= 1;
    } else {
      current = 0;
    }
  }

  if (monthOf(targetDay) !== shieldMonth) shieldsLeft = MONTHLY_SHIELDS;
  return { current, shieldsLeft };
}

export function recordStudyDay(streak: Streak, day: string): Streak {
  assertDay(day);
  if (!hasLastDay(streak)) {
    return {
      current: 1,
      best: Math.max(streak.best, 1),
      shieldsLeft: MONTHLY_SHIELDS,
      lastDay: day,
    };
  }
  assertDay(streak.lastDay);
  if (daysBetween(streak.lastDay, day) <= 0) return streak;

  const settled = settleMissedDays(streak, addDays(day, -1), day);
  const current = settled.current + 1;
  return {
    current,
    best: Math.max(streak.best, current),
    shieldsLeft: settled.shieldsLeft,
    lastDay: day,
  };
}

export function streakAsOf(streak: Streak, today: string): Streak {
  assertDay(today);
  if (!hasLastDay(streak)) return streak;
  assertDay(streak.lastDay);
  if (daysBetween(streak.lastDay, today) <= 0) return streak;

  const settled = settleMissedDays(streak, addDays(today, -1), today);
  return { ...streak, ...settled };
}
