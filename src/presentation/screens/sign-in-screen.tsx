"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, CardDescription, CardTitle } from "@/presentation/components/ui";
import { pt } from "@/presentation/i18n/pt";
import { useAuth } from "@/presentation/hooks/use-auth";

type Mode = "signIn" | "signUp";

export function SignInScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("proximo") ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.includes("@")) {
      setError(pt.auth.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setError(pt.auth.weakPassword);
      return;
    }

    setLoading(true);
    const result =
      mode === "signIn"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? pt.auth.genericError);
      return;
    }

    if (result.needsEmailConfirmation) {
      setMessage(pt.auth.checkEmail);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand">{pt.app.name}</h1>
        <p className="mt-1 text-sm text-muted">{pt.app.tagline}</p>
      </div>

      <Card>
        <CardTitle>{pt.auth.signInTitle}</CardTitle>
        <CardDescription>{pt.auth.signInSubtitle}</CardDescription>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              {pt.auth.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={pt.auth.emailPlaceholder}
              className="h-11 rounded-md border border-border bg-background px-3 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              {pt.auth.password}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={pt.auth.passwordPlaceholder}
              className="h-11 rounded-md border border-border bg-background px-3 text-base"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="text-sm text-success">
              {message}
            </p>
          ) : null}

          <Button type="submit" size="lg" loading={loading}>
            {mode === "signIn" ? pt.auth.signIn : pt.auth.signUp}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => void signInWithGoogle(nextPath)}
        >
          {pt.auth.withGoogle}
        </Button>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "signIn" ? pt.auth.noAccount : pt.auth.hasAccount}{" "}
          <button
            type="button"
            className="font-medium text-brand underline underline-offset-2"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signIn" ? pt.auth.signUp : pt.auth.signIn}
          </button>
        </p>
      </Card>
    </main>
  );
}
