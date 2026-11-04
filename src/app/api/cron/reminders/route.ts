import { sendReminder, sendReviewRequest } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking, Business } from "@/lib/types";

export const maxDuration = 60;

/**
 * Sends due reminders and review requests. Call every 10–15 minutes from a
 * scheduler with `Authorization: Bearer $CRON_SECRET` (see README).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const businesses = new Map<string, Business | null>();
  async function businessFor(id: string) {
    if (!businesses.has(id)) {
      const { data } = await admin.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
      businesses.set(id, data);
    }
    return businesses.get(id) ?? null;
  }

  // Claim rows before sending, so overlapping runs never double-send.
  async function claim(column: "reminder_24h_at" | "reminder_1h_at" | "review_requested_at", ids: string[]) {
    if (!ids.length) return [] as Booking[];
    const { data } = await admin
      .from("bookings")
      .update({ [column]: iso(now) })
      .in("id", ids)
      .is(column, null)
      .select("*")
      .returns<Booking[]>();
    return data ?? [];
  }

  const counts = { reminder_24h: 0, reminder_1h: 0, review_request: 0 };

  // Day-before reminders: starts in 3–24 hours, booked more than an hour ago.
  const { data: day } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .is("reminder_24h_at", null)
    .gt("starts_at", iso(now + 3 * 3_600_000))
    .lte("starts_at", iso(now + 24 * 3_600_000))
    .lt("created_at", iso(now - 3_600_000))
    .limit(200);
  for (const b of await claim("reminder_24h_at", (day ?? []).map((r) => r.id))) {
    const biz = await businessFor(b.business_id);
    if (biz) {
      await sendReminder(biz, b, "reminder_24h");
      counts.reminder_24h++;
    }
  }

  // On-the-day reminders: starts within 75 minutes, booked more than 30 minutes ago.
  const { data: soon } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .is("reminder_1h_at", null)
    .gt("starts_at", iso(now))
    .lte("starts_at", iso(now + 75 * 60_000))
    .lt("created_at", iso(now - 30 * 60_000))
    .limit(200);
  for (const b of await claim("reminder_1h_at", (soon ?? []).map((r) => r.id))) {
    const biz = await businessFor(b.business_id);
    if (biz) {
      await sendReminder(biz, b, "reminder_1h");
      counts.reminder_1h++;
    }
  }

  // Google review requests after completed jobs, honouring each business's delay.
  const { data: done } = await admin
    .from("bookings")
    .select("id,business_id,completed_at")
    .eq("status", "completed")
    .is("review_requested_at", null)
    .gte("completed_at", iso(now - 7 * 86_400_000))
    .limit(300);
  const due: string[] = [];
  for (const r of done ?? []) {
    const biz = await businessFor(r.business_id);
    if (!biz?.google_review_url || !r.completed_at) continue;
    if (new Date(r.completed_at).getTime() + biz.review_delay_hours * 3_600_000 <= now) due.push(r.id);
  }
  for (const b of await claim("review_requested_at", due)) {
    const biz = await businessFor(b.business_id);
    if (biz) {
      await sendReviewRequest(biz, b);
      counts.review_request++;
    }
  }

  return Response.json({ ok: true, ...counts });
}
