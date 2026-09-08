import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publicSupabaseEnv, serviceRoleKey } from "./env";

/**
 * Cliente com service_role: IGNORA o RLS. Equivale ao firebase-admin do plano.
 * Use somente em rotas de API do servidor (ex.: /api/tutor gravando licoes
 * geradas e custos). Nunca importe isto de codigo que roda no navegador.
 */
export function createSupabaseAdminClient() {
  const env = publicSupabaseEnv();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
