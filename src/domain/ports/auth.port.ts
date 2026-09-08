export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string;
}

export interface AuthOutcome {
  readonly ok: boolean;
  readonly message?: string;
  /** Cadastro feito, mas falta clicar no link enviado por e-mail. */
  readonly needsEmailConfirmation?: boolean;
}

/** O app so conhece esta interface de autenticacao - nunca o SDK do provedor. */
export interface AuthPort {
  signInWithPassword(email: string, password: string): Promise<AuthOutcome>;
  signUpWithPassword(email: string, password: string): Promise<AuthOutcome>;
  signInWithGoogle(redirectPath: string): Promise<AuthOutcome>;
  signOut(): Promise<void>;
  currentUser(): Promise<AuthenticatedUser | null>;
}
