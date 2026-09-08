import type { ClockPort } from "@/domain/ports/clock.port";

/** Unico lugar do app autorizado a chamar new Date() sem parametros. */
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }

  today(): string {
    const now = this.now();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
