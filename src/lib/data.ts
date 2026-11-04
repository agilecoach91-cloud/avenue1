import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SlotOptions } from "@/lib/slots";
import type { AvailabilityRule, Business, Service } from "@/lib/types";

/** Public, published business + its active services (server only, bypasses RLS). */
export const getPublicBusiness = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .eq("published", true)
    .maybeSingle<Business>();
  if (!business) return null;
  const { data: services } = await admin
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("sort")
    .returns<Service[]>();
  return { business, services: services ?? [] };
});

/** Everything the slot engine needs for one service. */
export async function loadSlotOptions(business: Business, service: Service): Promise<SlotOptions> {
  const admin = createAdminClient();
  const now = new Date();
  const until = new Date(now.getTime() + (business.booking_window_days + 2) * 86_400_000);

  const [{ data: rules }, { data: bookings }, { data: off }] = await Promise.all([
    admin
      .from("availability")
      .select("weekday,start_minute,end_minute")
      .eq("business_id", business.id)
      .returns<AvailabilityRule[]>(),
    admin
      .from("bookings")
      .select("starts_at,ends_at")
      .eq("business_id", business.id)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", until.toISOString())
      .gt("ends_at", now.toISOString()),
    admin
      .from("time_off")
      .select("starts_at,ends_at")
      .eq("business_id", business.id)
      .lt("starts_at", until.toISOString())
      .gt("ends_at", now.toISOString()),
  ]);

  const busy = [...(bookings ?? []), ...(off ?? [])].map((b) => ({
    start: new Date(b.starts_at as string),
    end: new Date(b.ends_at as string),
  }));

  return {
    timezone: business.timezone,
    rules: rules ?? [],
    busy,
    durationMin: service.duration_min,
    intervalMin: business.slot_interval_min,
    leadTimeHours: business.lead_time_hours,
    windowDays: business.booking_window_days,
    now,
  };
}

/** Signed-in owner and their business. Sends them to login or onboarding when needed. */
export const requireOwner = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle<Business>();
  if (!business) redirect("/onboarding");
  return { supabase, user, business };
});
