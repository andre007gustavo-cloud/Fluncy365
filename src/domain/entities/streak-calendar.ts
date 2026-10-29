const DAY_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function parseDay(day: string): number {
  const match = DAY_FORMAT.exec(day);
  if (!match) {
    throw new Error(`Dia inválido "${day}": use o formato YYYY-MM-DD.`);
  }
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, date);
  const parsed = new Date(ms);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    throw new Error(`Dia inválido "${day}": essa data não existe no calendário.`);
  }
  return ms;
}

export function assertDay(day: string): void {
  parseDay(day);
}

export function addDays(day: string, n: number): string {
  if (!Number.isInteger(n)) {
    throw new Error(`Quantidade de dias inválida: ${n}.`);
  }
  return new Date(parseDay(day) + n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b) - parseDay(a)) / MS_PER_DAY);
}

export function monthOf(day: string): string {
  assertDay(day);
  return day.slice(0, 7);
}
