import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { localDate, parseDailyLimits, todayIn, type SlotOptions } from "@/lib/slots";
import type { Addon, AvailabilityRule, Business, Conversation, Location, Service } from "@/lib/types";

/** Public, published business with its active services, add-ons and locations (bypasses RLS). */
export const getPublicBusiness = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .eq("published", true)
    .maybeSingle<Business>();
  if (!business) return null;
  const [{ data: services }, { data: addons }, { data: locations }] = await Promise.all([
    admin
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort")
      .returns<Service[]>(),
    admin
      .from("addons")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort")
      .returns<Addon[]>(),
    admin
      .from("locations")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort")
      .returns<Location[]>(),
  ]);
  return { business, services: services ?? [], addons: addons ?? [], locations: locations ?? [] };
});

export type PublicBusiness = NonNullable<Awaited<ReturnType<typeof getPublicBusiness>>>;

/** The location a request is for: the one asked for, or the only one. */
export function pickLocation(locations: Location[], id: string | null | undefined): Location | null {
  if (id) return locations.find((l) => l.id === id) ?? null;
  return locations.length === 1 ? locations[0] : null;
}

/** Everything the slot engine needs for one location and job length. */
export async function loadSlotOptions(business: Business, location: Location, durationMin: number): Promise<SlotOptions> {
  const admin = createAdminClient();
  const now = new Date();
  const tz = business.timezone;
  const startOfToday = fromZonedTime(`${todayIn(tz, now)}T00:00:00`, tz);
  const until = new Date(now.getTime() + (business.booking_window_days + 2) * 86_400_000);

  const [{ data: rules }, { data: bookings }, { data: off }] = await Promise.all([
    admin
      .from("availability")
      .select("weekday,start_minute,end_minute")
      .eq("location_id", location.id)
      .returns<AvailabilityRule[]>(),
    admin
      .from("bookings")
      .select("starts_at,ends_at,status")
      .eq("location_id", location.id)
      .in("status", ["pending", "confirmed", "completed"])
      .lt("starts_at", until.toISOString())
      .gt("ends_at", startOfToday.toISOString()),
    admin
      .from("time_off")
      .select("starts_at,ends_at")
      .eq("location_id", location.id)
      .lt("starts_at", until.toISOString())
      .gt("ends_at", now.toISOString()),
  ]);

  const active = (bookings ?? []).filter((b) => b.status !== "completed");
  const busy = [...active, ...(off ?? [])].map((b) => ({
    start: new Date(b.starts_at as string),
    end: new Date(b.ends_at as string),
  }));

  // Jobs already on each day, for the location's daily limits.
  const dayCounts: Record<string, number> = {};
  for (const b of bookings ?? []) {
    const d = localDate(b.starts_at as string, tz);
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  }

  return {
    timezone: tz,
    rules: rules ?? [],
    busy,
    durationMin,
    intervalMin: business.slot_interval_min,
    leadTimeHours: location.lead_time_hours,
    windowDays: business.booking_window_days,
    now,
    dailyLimits: parseDailyLimits(location.daily_limits),
    dayCounts,
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

/** The owner's locations, in display order. */
export async function ownerLocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
): Promise<Location[]> {
  const { data } = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", businessId)
    .order("sort")
    .returns<Location[]>();
  return data ?? [];
}

/** Inbox threads, newest first, optionally for one location. */
export async function ownerConversations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  locationId: string,
): Promise<Conversation[]> {
  let q = supabase.from("conversations").select("*").eq("business_id", businessId);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.order("last_message_at", { ascending: false }).limit(200).returns<Conversation[]>();
  return data ?? [];
}
