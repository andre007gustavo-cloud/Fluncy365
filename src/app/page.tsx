import { redirect } from "next/navigation";
import { serverContainer } from "@/di";
import { ENGLISH_COURSE_ID } from "@/infrastructure/supabase/course";
import { getCurrentUser } from "@/infrastructure/supabase/server";
import { TodayScreen } from "@/presentation/screens/today-screen";
import { SignOutButton } from "@/presentation/components/sign-out-button";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const container = await serverContainer();
  const overview = await container.useCases.getTodayOverview.execute(user.id, ENGLISH_COURSE_ID);

  const metadata = user.user_metadata as { full_name?: string; name?: string };
  const displayName = metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "";

  return (
    <main>
      <TodayScreen overview={overview} displayName={displayName} />
      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        <SignOutButton />
      </div>
    </main>
  );
}
