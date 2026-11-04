import type { NextRequest } from "next/server";
import { getPublicBusiness, loadSlotOptions } from "@/lib/data";
import { slotsForDate } from "@/lib/slots";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const slug = p.get("slug") ?? "";
  const serviceId = p.get("service") ?? "";
  const date = p.get("date") ?? "";

  const data = await getPublicBusiness(slug);
  const service = data?.services.find((s) => s.id === serviceId && s.booking_mode === "instant");
  if (!data || !service) return Response.json({ error: "Not found" }, { status: 404 });

  const options = await loadSlotOptions(data.business, service);
  return Response.json(
    { slots: slotsForDate(date, options) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
