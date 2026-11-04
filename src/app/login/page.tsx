import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: `Sign in: ${APP_NAME}` };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next?.startsWith("/") ? next : "/dashboard");

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 py-10">
      <Link href="/" className="type-display mb-8 text-2xl">
        {APP_NAME}
      </Link>
      <h1 className="type-display mb-2 text-[2rem]">Sign in</h1>
      <p className="mb-6 text-steel">We&apos;ll email you a link. No password to remember.</p>
      <LoginForm next={next ?? "/dashboard"} error={error === "link" ? "That link has expired. Send a new one." : undefined} />
    </main>
  );
}
