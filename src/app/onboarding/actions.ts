"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { countryFor, toE164, TIMEZONES } from "@/lib/format";
import { searchPlaces, type PlaceResult } from "@/lib/google-places";
import { isValidSlug, slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_HOURS, templateFor, TRADE_TEMPLATES } from "@/lib/templates";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  return { supabase, user };
}

export async function findOnGoogle(query: string): Promise<PlaceResult[]> {
  await requireUser();
  return searchPlaces(query.slice(0, 120));
}

export async function checkSlug(raw: string): Promise<{ slug: string; available: boolean }> {
  await requireUser();
  const slug = slugify(raw);
  if (!isValidSlug(slug)) return { slug, available: false };
  const { data } = await createAdminClient().from("businesses").select("id").eq("slug", slug).maybeSingle();
  return { slug, available: !data };
}

const Input = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(80),
  trade: z.enum(TRADE_TEMPLATES.map((t) => t.id) as [string, ...string[]]),
  slug: z.string().trim().toLowerCase(),
  phone: z.string().trim().min(8, "Enter your mobile so we can text you new bookings"),
  email: z.email("Enter a valid email"),
  service_area: z.string().trim().max(160).optional(),
  timezone: z.enum(TIMEZONES.map((t) => t.id) as [string, ...string[]]),
  google_place_id: z.string().max(200).optional(),
  google_review_url: z.string().url().max(300).optional().or(z.literal("")),
  google_rating: z.coerce.number().min(0).max(5).optional(),
  google_review_count: z.coerce.number().int().min(0).optional(),
  address: z.string().max(200).optional(),
  website_url: z.string().url().max(300).optional().or(z.literal("")),
});

export type OnboardingState = { error?: string };

export async function createBusiness(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string" && v !== "").map(([k, v]) => [k, v]),
  );
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;

  const slug = slugify(input.slug || input.name);
  if (!isValidSlug(slug)) return { error: "Choose a different page address (letters, numbers and dashes)." };

  const phone = toE164(input.phone, countryFor(input.timezone));
  if (!phone) return { error: "Check your phone number." };

  const template = templateFor(input.trade);
  const { data: business, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      slug,
      name: input.name,
      trade: input.trade,
      tagline: template.tagline,
      phone,
      email: input.email,
      service_area: input.service_area || null,
      timezone: input.timezone,
      address: input.address || null,
      website_url: input.website_url || null,
      google_place_id: input.google_place_id || null,
      google_review_url: input.google_review_url || null,
      google_rating: input.google_rating ?? null,
      google_review_count: input.google_review_count ?? null,
    })
    .select("id")
    .single();

  if (error || !business) {
    if (error?.code === "23505") {
      return error.message.includes("slug")
        ? { error: "That page address is taken. Try another." }
        : { error: "You already have a business set up." };
    }
    console.error("Create business failed", error);
    return { error: "We couldn't create your page. Try again." };
  }

  await supabase.from("services").insert(
    template.services.map((s, i) => ({
      business_id: business.id,
      name: s.name,
      description: s.description ?? null,
      price_type: s.price_type,
      price_cents: s.price_cents ?? null,
      duration_min: s.duration_min,
      booking_mode: s.booking_mode,
      questions: s.questions ?? [],
      repeat_months: s.repeat_months ?? null,
      sort: i,
    })),
  );
  await supabase.from("availability").insert(DEFAULT_HOURS.map((h) => ({ ...h, business_id: business.id })));

  redirect("/dashboard?welcome=1");
}
