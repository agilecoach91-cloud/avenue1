"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { hasIcon } from "@/components/Icon";
import { ownerLocations, requireOwner } from "@/lib/data";
import { countryFor, toE164, TIMEZONES } from "@/lib/format";
import { notifyBookingCancelled, notifyBookingConfirmed, sendInboxReply } from "@/lib/notify";
import { findOrCreateConversation } from "@/lib/inbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_HOURS } from "@/lib/templates";
import type { Booking, BookingStatus, Conversation, EnquiryStatus, Question } from "@/lib/types";

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

const BOOKING_ACTIONS: Record<string, BookingStatus> = {
  confirm: "confirmed",
  complete: "completed",
  cancel: "cancelled",
  no_show: "no_show",
};

export async function updateBooking(formData: FormData) {
  const { supabase, business } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const status = BOOKING_ACTIONS[String(formData.get("action") ?? "")];
  if (!status) return;

  const patch: Record<string, string> = { status };
  const now = new Date().toISOString();
  if (status === "confirmed") patch.confirmed_at = now;
  if (status === "completed") patch.completed_at = now;
  if (status === "cancelled") patch.cancelled_at = now;

  const { data: booking, error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id)
    .select("*")
    .single<Booking>();
  if (error || !booking) return;

  if (status === "confirmed") after(() => notifyBookingConfirmed(business, booking));
  if (status === "cancelled") after(() => notifyBookingCancelled(business, booking, false));
  revalidatePath("/dashboard", "layout");
}

// ---------------------------------------------------------------------------
// Quote requests
// ---------------------------------------------------------------------------

const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

export async function updateEnquiry(formData: FormData) {
  const { supabase, business } = await requireOwner();
  const status = String(formData.get("status") ?? "") as EnquiryStatus;
  if (!ENQUIRY_STATUSES.includes(status)) return;
  await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", String(formData.get("id") ?? ""))
    .eq("business_id", business.id);
  revalidatePath("/dashboard", "layout");
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const ServiceInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Give the service a name").max(80),
  description: z.string().trim().max(300).optional(),
  price_type: z.enum(["fixed", "from", "quote"]),
  price: z.string().trim().optional(),
  duration_min: z.coerce.number().int().min(15).max(600),
  booking_mode: z.enum(["instant", "quote"]),
  repeat_months: z.string().optional(),
  questions: z.string().optional(),
  icon: z.string().max(30).optional(),
});

export type FormState = { error?: string; ok?: boolean };

function parseQuestions(raw: string | undefined): Question[] {
  // One question per line: "Label" or "Label: option 1, option 2". A trailing "?" in the label is fine.
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line, i) => {
      const colon = line.indexOf(":");
      const label = (colon === -1 ? line : line.slice(0, colon)).trim();
      const opts = colon === -1 ? "" : line.slice(colon + 1).trim();
      const options = opts ? opts.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 12) : [];
      return {
        id: `q${i + 1}`,
        label: label.slice(0, 100),
        type: options.length ? "select" : "text",
        options: options.length ? options : undefined,
        required: true,
      } satisfies Question;
    });
}

export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireOwner();
  const parsed = ServiceInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const s = parsed.data;

  let price_cents: number | null = null;
  if (s.price_type !== "quote") {
    const dollars = Number((s.price ?? "").replace(/[$,\s]/g, ""));
    if (!Number.isFinite(dollars) || dollars < 0) return { error: "Enter a price in dollars, or choose 'Quote'." };
    price_cents = Math.round(dollars * 100);
  }
  const repeat = s.repeat_months ? Number(s.repeat_months) : null;

  const row = {
    business_id: business.id,
    name: s.name,
    description: s.description || null,
    price_type: s.price_type,
    price_cents,
    duration_min: s.duration_min,
    booking_mode: s.price_type === "quote" ? "quote" : s.booking_mode,
    repeat_months: repeat && repeat > 0 ? repeat : null,
    questions: parseQuestions(s.questions),
    icon: hasIcon(s.icon) ? s.icon : null,
  };

  if (s.id) {
    const { error } = await supabase.from("services").update(row).eq("id", s.id).eq("business_id", business.id);
    if (error) return { error: "Couldn't save the service." };
  } else {
    const { count } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);
    const { error } = await supabase.from("services").insert({ ...row, sort: count ?? 0 });
    if (error) return { error: "Couldn't add the service." };
  }
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services?saved=1");
}

export async function serviceCommand(formData: FormData) {
  const { supabase, business } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const command = String(formData.get("command") ?? "");

  if (command === "delete") {
    await supabase.from("services").delete().eq("id", id).eq("business_id", business.id);
    revalidatePath("/dashboard/services");
    redirect("/dashboard/services");
  } else if (command === "toggle") {
    const { data } = await supabase.from("services").select("active").eq("id", id).single();
    if (data) await supabase.from("services").update({ active: !data.active }).eq("id", id);
  } else if (command === "up" || command === "down") {
    const { data: list } = await supabase
      .from("services")
      .select("id,sort")
      .eq("business_id", business.id)
      .order("sort");
    if (list) {
      const i = list.findIndex((r) => r.id === id);
      const j = command === "up" ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < list.length) {
        [list[i], list[j]] = [list[j], list[i]];
        await Promise.all(list.map((r, k) => supabase.from("services").update({ sort: k }).eq("id", r.id)));
      }
    }
  }
  revalidatePath("/dashboard/services");
}

// ---------------------------------------------------------------------------
// Locations, hours, booking limits and blocked dates
// ---------------------------------------------------------------------------

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v <= 1440 ? v : null;
}

/** The owner's location named in the form, or null if it isn't theirs. */
async function ownedLocation(formData: FormData) {
  const ctx = await requireOwner();
  const id = String(formData.get("location") ?? "");
  const { data } = await ctx.supabase
    .from("locations")
    .select("id,lead_time_hours")
    .eq("id", id)
    .eq("business_id", ctx.business.id)
    .maybeSingle<{ id: string; lead_time_hours: number }>();
  return { ...ctx, location: data };
}

const LocationInput = z.object({
  name: z.string().trim().min(1, "Give the location a name").max(80),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
});

export async function addLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireOwner();
  const parsed = LocationInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const phone = parsed.data.phone ? toE164(parsed.data.phone, countryFor(business.timezone)) : null;
  if (parsed.data.phone && !phone) return { error: "Check the phone number." };

  const existing = await ownerLocations(supabase, business.id);
  const { data: created, error } = await supabase
    .from("locations")
    .insert({
      business_id: business.id,
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone,
      lead_time_hours: existing[0]?.lead_time_hours ?? 12,
      sort: existing.length,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !created) return { error: "Couldn't add the location." };

  // Start with the same hours as the first location, so it's bookable straight away.
  let hours: { weekday: number; start_minute: number; end_minute: number }[] = DEFAULT_HOURS;
  if (existing[0]) {
    const { data } = await supabase
      .from("availability")
      .select("weekday,start_minute,end_minute")
      .eq("location_id", existing[0].id);
    if (data?.length) hours = data;
  }
  await supabase
    .from("availability")
    .insert(hours.map((h) => ({ ...h, business_id: business.id, location_id: created.id })));
  revalidatePath("/dashboard/calendar");
  redirect(`/dashboard/calendar/${created.id}?saved=added`);
}

export async function saveLocationDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business, location } = await ownedLocation(formData);
  if (!location) return { error: "That location no longer exists." };
  const parsed = LocationInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const phone = parsed.data.phone ? toE164(parsed.data.phone, countryFor(business.timezone)) : null;
  if (parsed.data.phone && !phone) return { error: "Check the phone number." };
  const { error } = await supabase
    .from("locations")
    .update({ name: parsed.data.name, address: parsed.data.address || null, phone })
    .eq("id", location.id);
  if (error) return { error: "Couldn't save the location." };
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

export async function deleteLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business, location } = await ownedLocation(formData);
  if (!location) return { error: "That location no longer exists." };
  const all = await ownerLocations(supabase, business.id);
  if (all.length < 2) return { error: "You need at least one location." };
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("location_id", location.id)
    .in("status", ["pending", "confirmed"])
    .gte("ends_at", new Date().toISOString());
  if ((count ?? 0) > 0) {
    return { error: `Cancel or finish the ${count} upcoming booking${count === 1 ? "" : "s"} at this location first.` };
  }
  await supabase.from("locations").delete().eq("id", location.id);
  revalidatePath("/dashboard/calendar");
  redirect("/dashboard/calendar");
}

export async function saveLocationHours(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business, location } = await ownedLocation(formData);
  if (!location) return { error: "That location no longer exists." };
  const rows: { business_id: string; location_id: string; weekday: number; start_minute: number; end_minute: number }[] = [];
  for (let d = 0; d < 7; d++) {
    if (formData.get(`open_${d}`) !== "on") continue;
    const start = toMinutes(String(formData.get(`start_${d}`) ?? ""));
    const end = toMinutes(String(formData.get(`end_${d}`) ?? ""));
    if (start == null || end == null || end <= start) {
      return { error: "Each open day needs a finish time after its start time." };
    }
    rows.push({ business_id: business.id, location_id: location.id, weekday: d, start_minute: start, end_minute: end });
  }
  await supabase.from("availability").delete().eq("location_id", location.id);
  if (rows.length) await supabase.from("availability").insert(rows);
  revalidatePath(`/dashboard/calendar/${location.id}`);
  return { ok: true };
}

export async function saveLocationLimits(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, location } = await ownedLocation(formData);
  if (!location) return { error: "That location no longer exists." };
  const notice = z.coerce.number().int().min(0).max(336).safeParse(formData.get("lead_time_hours"));
  if (!notice.success) return { error: "Choose how much notice you need." };
  const limits: Record<string, number> = {};
  for (let d = 0; d < 7; d++) {
    const raw = String(formData.get(`limit_${d}`) ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 50) return { error: "Daily limits must be whole numbers from 0 to 50." };
    limits[String(d)] = n;
  }
  await supabase
    .from("locations")
    .update({ lead_time_hours: notice.data, daily_limits: limits })
    .eq("id", location.id);
  revalidatePath(`/dashboard/calendar/${location.id}`);
  return { ok: true };
}

export async function addBlockedDates(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business, location } = await ownedLocation(formData);
  if (!location) return { error: "That location no longer exists." };
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "") || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return { error: "Choose a start and end date." };
  }
  const starts_at = fromZonedTime(`${from}T00:00:00`, business.timezone).toISOString();
  const end = new Date(fromZonedTime(`${to}T00:00:00`, business.timezone).getTime() + 86_400_000);
  const { error } = await supabase.from("time_off").insert({
    business_id: business.id,
    location_id: location.id,
    starts_at,
    ends_at: end.toISOString(),
    note: String(formData.get("note") ?? "").slice(0, 100) || null,
  });
  if (error) return { error: "Couldn't block those dates." };
  revalidatePath(`/dashboard/calendar/${location.id}`);
  return { ok: true };
}

export async function deleteBlockedDate(formData: FormData) {
  const { supabase, business } = await requireOwner();
  await supabase.from("time_off").delete().eq("id", String(formData.get("id") ?? "")).eq("business_id", business.id);
  revalidatePath("/dashboard/calendar", "layout");
}

// ---------------------------------------------------------------------------
// Add-ons ("Do you need anything else?")
// ---------------------------------------------------------------------------

const AddonInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Give the add-on a name").max(80),
  description: z.string().trim().max(200).optional(),
  price: z.string().trim().optional(),
  price_note: z.string().trim().max(30).optional(),
  icon: z.string().max(30).optional(),
});

export async function saveAddon(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireOwner();
  const parsed = AddonInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const a = parsed.data;
  let price_cents: number | null = null;
  if (a.price) {
    const dollars = Number(a.price.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(dollars) || dollars < 0) return { error: "Enter a price in dollars, or leave it blank." };
    price_cents = Math.round(dollars * 100);
  }
  const row = {
    business_id: business.id,
    name: a.name,
    description: a.description || null,
    price_cents,
    price_note: a.price_note || null,
    icon: hasIcon(a.icon) ? a.icon : null,
  };
  if (a.id) {
    const { error } = await supabase.from("addons").update(row).eq("id", a.id).eq("business_id", business.id);
    if (error) return { error: "Couldn't save the add-on." };
  } else {
    const { count } = await supabase
      .from("addons")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);
    const { error } = await supabase.from("addons").insert({ ...row, sort: count ?? 0 });
    if (error) return { error: "Couldn't add the add-on." };
  }
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services?saved=addon");
}

export async function addonCommand(formData: FormData) {
  const { supabase, business } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const command = String(formData.get("command") ?? "");
  if (command === "delete") {
    await supabase.from("addons").delete().eq("id", id).eq("business_id", business.id);
    revalidatePath("/dashboard/services");
    redirect("/dashboard/services");
  } else if (command === "toggle") {
    const { data } = await supabase.from("addons").select("active").eq("id", id).single();
    if (data) await supabase.from("addons").update({ active: !data.active }).eq("id", id);
  } else if (command === "up" || command === "down") {
    const { data: list } = await supabase
      .from("addons")
      .select("id,sort")
      .eq("business_id", business.id)
      .order("sort");
    if (list) {
      const i = list.findIndex((r) => r.id === id);
      const j = command === "up" ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < list.length) {
        [list[i], list[j]] = [list[j], list[i]];
        await Promise.all(list.map((r, k) => supabase.from("addons").update({ sort: k }).eq("id", r.id)));
      }
    }
  }
  revalidatePath("/dashboard/services");
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function sendReply(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireOwner();
  const id = String(formData.get("conversation") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > 640) return { error: "Keep texts under 640 characters." };
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Conversation>();
  if (!conversation) return { error: "That conversation no longer exists." };

  const result = await sendInboxReply(business, conversation, body);
  revalidatePath("/dashboard/inbox", "layout");
  if (result?.status === "skipped") {
    return {
      error:
        result.error === "Monthly SMS allowance used"
          ? "You've used this month's texts. Upgrade your plan to keep texting."
          : "Texting customers isn't included on the Free plan. Upgrade to Starter to reply by text.",
    };
  }
  if (result?.status === "failed") return { error: "The text didn't send. Check the number and try again." };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (v && !/^https?:\/\//.test(v) ? `https://${v}` : v))
  .pipe(z.union([z.literal(""), z.url()]));

const SettingsInput = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140).optional(),
  about: z.string().trim().max(1500).optional(),
  phone: z.string().trim().min(8),
  email: z.email(),
  service_area: z.string().trim().max(160).optional(),
  licence_number: z.string().trim().max(60).optional(),
  abn: z.string().trim().max(20).optional(),
  timezone: z.enum(TIMEZONES.map((t) => t.id) as [string, ...string[]]),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  google_review_url: optionalUrl,
  instagram_url: optionalUrl,
  facebook_url: optionalUrl,
  website_url: optionalUrl,
  review_delay_hours: z.coerce.number().int().min(0).max(168),
  booking_window_days: z.coerce.number().int().min(1).max(180),
  slot_interval_min: z.coerce.number().refine((v) => [15, 30, 60, 120].includes(v)),
  auto_confirm: z.string().optional(),
  notify_owner_sms: z.string().optional(),
  notify_owner_email: z.string().optional(),
  published: z.string().optional(),
});

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, business } = await requireOwner();
  const parsed = SettingsInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Check ${String(issue?.path[0] ?? "the form").replace(/_/g, " ")}.` };
  }
  const s = parsed.data;
  const phone = toE164(s.phone, countryFor(s.timezone));
  if (!phone) return { error: "Check your phone number." };

  const { error } = await supabase
    .from("businesses")
    .update({
      name: s.name,
      tagline: s.tagline || null,
      about: s.about || null,
      phone,
      email: s.email,
      service_area: s.service_area || null,
      licence_number: s.licence_number || null,
      abn: s.abn || null,
      timezone: s.timezone,
      brand_color: s.brand_color.toLowerCase(),
      google_review_url: s.google_review_url || null,
      instagram_url: s.instagram_url || null,
      facebook_url: s.facebook_url || null,
      website_url: s.website_url || null,
      review_delay_hours: s.review_delay_hours,
      booking_window_days: s.booking_window_days,
      slot_interval_min: s.slot_interval_min,
      auto_confirm: s.auto_confirm === "on",
      notify_owner_sms: s.notify_owner_sms === "on",
      notify_owner_email: s.notify_owner_email === "on",
      published: s.published === "on",
    })
    .eq("id", business.id);
  if (error) return { error: "Couldn't save your settings." };

  for (const [field, column, prefix] of [
    ["logo", "logo_url", "logo"],
    ["cover", "cover_url", "cover"],
  ] as const) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const limit = field === "cover" ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
    const types = field === "cover" ? ["image/png", "image/jpeg", "image/webp"] : ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!types.includes(file.type) || file.size > limit) {
      return {
        error:
          field === "cover"
            ? "The photo must be a PNG, JPG or WebP under 4 MB."
            : "Logo must be a PNG, JPG, WebP or SVG under 2 MB.",
      };
    }
    const admin = createAdminClient();
    const ext = file.type.split("/")[1].replace("svg+xml", "svg").replace("jpeg", "jpg");
    const path = `${business.id}/${prefix}-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from("logos").upload(path, file, { contentType: file.type });
    if (upErr) return { error: `Couldn't upload the ${field === "cover" ? "photo" : "logo"}.` };
    const { data } = admin.storage.from("logos").getPublicUrl(path);
    await supabase.from("businesses").update({ [column]: data.publicUrl }).eq("id", business.id);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Text this customer" from a booking or quote: opens their thread, creating it if needed. */
export async function openConversation(formData: FormData) {
  const { business } = await requireOwner();
  const phone = String(formData.get("phone") ?? "");
  if (!/^\+\d{8,15}$/.test(phone)) return;
  const conversation = await findOrCreateConversation(createAdminClient(), business.id, phone, {
    customerName: String(formData.get("name") ?? "") || null,
    locationId: String(formData.get("location") ?? "") || null,
  });
  if (conversation) redirect(`/dashboard/inbox/${conversation.id}`);
}
