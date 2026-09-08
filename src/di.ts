import "server-only";
import { GetTodayOverview } from "@/application/get-today-overview";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  SupabaseSrsCardRepository,
  SupabaseStreakRepository,
  SupabaseStudentModelRepository,
} from "@/infrastructure/supabase/supabase-repositories";

/**
 * Composition root do lado servidor (principio D do SOLID): o unico lugar
 * onde as implementacoes concretas encontram as interfaces do dominio.
 * Nenhum componente de UI monta suas proprias dependencias.
 */
export async function serverContainer() {
  const supabase = await createSupabaseServerClient();
  const clock = new SystemClock();

  const srsCards = new SupabaseSrsCardRepository(supabase);
  const streaks = new SupabaseStreakRepository(supabase);
  const studentModels = new SupabaseStudentModelRepository(supabase);

  return {
    clock,
    supabase,
    useCases: {
      getTodayOverview: new GetTodayOverview({ clock, srsCards, streaks, studentModels }),
    },
  };
}

export type ServerContainer = Awaited<ReturnType<typeof serverContainer>>;
