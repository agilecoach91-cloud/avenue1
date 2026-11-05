import type { NextRequest } from "next/server";
import { getPublicBusiness, loadSlotOptions, pickLocation } from "@/lib/data";
import { totalDuration } from "@/lib/pricing";
import { datesWithSlots, slotsForDate } from "@/lib/slots";

/**
 * Free days and times for one location and a set of services.
 * ?slug=&location=&services=id,id&date=YYYY-MM-DD (date optional: first free day).
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const data = await getPublicBusiness(p.get("slug") ?? "");
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });

  const location = pickLocation(data.locations, p.get("location"));
  const ids = (p.get("services") ?? "").split(",").filter(Boolean);
  const services = data.services.filter((s) => ids.includes(s.id) && s.booking_mode === "instant");
  if (!location || services.length === 0 || services.length !== new Set(ids).size) {
    return Response.json({ error: "Choose a location and a service." }, { status: 400 });
  }

  const options = await loadSlotOptions(data.business, location, totalDuration(services));
  const dates = datesWithSlots(options);
  const asked = p.get("date");
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : (dates[0] ?? null);

  return Response.json(
    { dates, date, slots: date ? slotsForDate(date, options) : [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
