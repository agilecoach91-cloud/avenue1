import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_NAME, appUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: `Set up your page: ${APP_NAME}` };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data: existing } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="type-display mb-8 text-xl">{APP_NAME}</p>
      <h1 className="type-display text-[2rem] sm:text-[2.4rem]">Set up your booking page</h1>
      <p className="mb-8 mt-2 text-steel">
        Takes about two minutes. You can change everything later.
      </p>
      <OnboardingForm
        email={user.email ?? ""}
        googleEnabled={Boolean(process.env.GOOGLE_PLACES_API_KEY)}
        appHost={new URL(appUrl()).host}
      />
    </main>
  );
}
