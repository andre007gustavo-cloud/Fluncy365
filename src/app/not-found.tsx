import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/presentation/components/ui";
import { pt } from "@/presentation/i18n/pt";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <Card>
        <CardTitle>{pt.errors.notFoundTitle}</CardTitle>
        <CardDescription>{pt.errors.notFoundBody}</CardDescription>
        <Link href="/" className="mt-4 inline-block font-medium text-brand underline">
          {pt.errors.backHome}
        </Link>
      </Card>
    </main>
  );
}
