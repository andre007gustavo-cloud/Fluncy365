"use client";

import { useCallback, useMemo } from "react";
import { authGateway } from "@/di.client";
import type { AuthOutcome } from "@/domain/ports/auth.port";

/** Ponte fina entre a UI e o AuthPort. Nao contem regra de negocio. */
export function useAuth() {
  const auth = useMemo(() => authGateway(), []);

  const signInWithPassword = useCallback(
    (email: string, password: string): Promise<AuthOutcome> =>
      auth.signInWithPassword(email, password),
    [auth],
  );

  const signUpWithPassword = useCallback(
    (email: string, password: string): Promise<AuthOutcome> =>
      auth.signUpWithPassword(email, password),
    [auth],
  );

  const signInWithGoogle = useCallback(
    (redirectPath: string): Promise<AuthOutcome> => auth.signInWithGoogle(redirectPath),
    [auth],
  );

  const signOut = useCallback((): Promise<void> => auth.signOut(), [auth]);

  return { signInWithPassword, signUpWithPassword, signInWithGoogle, signOut };
}
