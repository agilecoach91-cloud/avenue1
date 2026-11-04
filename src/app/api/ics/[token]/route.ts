import { appUrl } from "@/lib/env";
import { formatPhone } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking, Business } from "@/lib/types";

/** Private calendar feed of a business's bookings, for Google Calendar or iPhone. */
export async function GET(_request: Request, ctx: RouteContext<"/api/ics/[token]">) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{36}$/.test(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("*").eq("ics_token", token).maybeSingle<Business>();
  if (!business) return new Response("Not found", { status: 404 });

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .in("status", ["pending", "confirmed", "completed", "cancelled"])
    .gte("starts_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
    .order("starts_at")
    .limit(1000)
    .returns<Booking[]>();

  const ics = buildIcs(`${business.name} bookings`, (bookings ?? []).map((b) => ({
    uid: `${b.id}@bookd`,
    start: b.starts_at,
    end: b.ends_at,
    summary: `${b.status === "pending" ? "[To confirm] " : ""}${b.service_name}: ${b.customer_name}`,
    description: [
      `${b.customer_name} ${formatPhone(b.customer_phone)}`,
      ...Object.entries(b.answers ?? {}).map(([k, v]) => `${k}: ${v}`),
      b.notes ? `Notes: ${b.notes}` : "",
      `${appUrl()}/dashboard/bookings`,
    ].filter(Boolean).join("\n"),
    location: b.address,
    cancelled: b.status === "cancelled",
  })));

  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
