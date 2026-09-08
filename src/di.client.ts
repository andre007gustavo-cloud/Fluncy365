import type { AuthPort } from "@/domain/ports/auth.port";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { SupabaseBrowserAuth } from "@/infrastructure/supabase/supabase-browser-auth";

/**
 * Composition root do navegador. A UI pede dependencias daqui e nunca
 * instancia adaptadores por conta propria.
 */
let auth: AuthPort | null = null;

export function authGateway(): AuthPort {
  auth ??= new SupabaseBrowserAuth();
  return auth;
}

export const clientClock = new SystemClock();
