import { appUrl } from "@/lib/env";
import { buildIcs } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking, Business } from "@/lib/types";

/** A single booking as a calendar file, for the customer's "Add to calendar" button. */
export async function GET(_request: Request, ctx: RouteContext<"/api/public/bookings/[token]/ics">) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{36}$/.test(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("*").eq("manage_token", token).maybeSingle<Booking>();
  if (!booking) return new Response("Not found", { status: 404 });
  const { data: business } = await admin.from("businesses").select("name,phone").eq("id", booking.business_id).single<Pick<Business, "name" | "phone">>();

  const ics = buildIcs(business?.name ?? "Booking", [
    {
      uid: `${booking.id}@bookd`,
      start: booking.starts_at,
      end: booking.ends_at,
      summary: `${booking.service_name}: ${business?.name ?? ""}`.trim(),
      description: `Manage your booking: ${appUrl()}/b/${token}`,
      location: booking.address,
      url: `${appUrl()}/b/${token}`,
      cancelled: booking.status === "cancelled",
    },
  ]);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking.ics"`,
    },
  });
}
