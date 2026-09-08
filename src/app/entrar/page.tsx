import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInScreen } from "@/presentation/screens/sign-in-screen";
import { pt } from "@/presentation/i18n/pt";

export const metadata: Metadata = { title: pt.auth.signIn };

export default function SignInPage() {
  return (
    <Suspense>
      <SignInScreen />
    </Suspense>
  );
}
