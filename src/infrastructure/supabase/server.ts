import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publicSupabaseEnv } from "./env";

/**
 * Cliente para Server Components, Route Handlers e Server Actions.
 * Continua sujeito ao RLS - a identidade vem do cookie de sessao.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = publicSupabaseEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components nao podem escrever cookies; o middleware ja
            // renovou a sessao antes da renderizacao, entao ignorar e seguro.
          }
        },
      },
    },
  );
}

/** Usuario autenticado ou null. Sempre valida no servidor de auth. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
