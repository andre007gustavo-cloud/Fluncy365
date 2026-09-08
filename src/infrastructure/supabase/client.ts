import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicSupabaseEnv } from "./env";

/** Cliente do navegador. Usa a anon key - toda protecao vem do RLS. */
export function createSupabaseBrowserClient() {
  const env = publicSupabaseEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
