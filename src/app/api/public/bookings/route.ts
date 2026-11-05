import { after } from "next/server";
import { z } from "zod";
import { getPublicBusiness, loadSlotOptions, pickLocation } from "@/lib/data";
import { countryFor, isMobile, toE164 } from "@/lib/format";
import { notifyBookingCreated } from "@/lib/notify";
import { joinNames, toBookedAddons, toItems, totalDuration, totalPrice } from "@/lib/pricing";
import { isSlotAvailable } from "@/lib/slots";
import { parseSource } from "@/lib/source";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Addon, Booking, Service } from "@/lib/types";

const Body = z.object({
  slug: z.string().min(3).max(40),
  locationId: z.uuid().optional().nullable(),
  serviceIds: z.array(z.uuid()).min(1, "Choose a service").max(5),
  addonIds: z.array(z.uuid()).max(12).default([]),
  start: z.iso.datetime(),
  flexible: z.boolean().default(false),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(8, "Enter your mobile number").max(20),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Check your email address").nullable()),
  address: z.string().trim().min(5, "Enter the job address").max(200),
  notes: z.string().trim().max(1000).optional().nullable(),
  answers: z.record(z.string().max(100), z.string().max(200)).default({}),
  source: z.string().max(20).optional().nullable(),
  company: z.string().optional().nullable(), // honeypot: real people leave it empty
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json({ error: first?.message ?? "Check your details and try again." }, { status: 400 });
  }
  const input = parsed.data;
  if (input.company) return Response.json({ error: "Booking rejected." }, { status: 400 });

  const data = await getPublicBusiness(input.slug);
  if (!data) return Response.json({ error: "This business isn't taking online bookings." }, { status: 404 });
  const { business } = data;

  const location = pickLocation(data.locations, input.locationId);
  if (!location) return Response.json({ error: "Choose a location." }, { status: 400 });

  const services = [...new Set(input.serviceIds)].map((id) =>
    data.services.find((s) => s.id === id && s.booking_mode === "instant"),
  );
  if (services.some((s) => !s)) {
    return Response.json({ error: "One of those services can't be booked online." }, { status: 400 });
  }
  const addons = [...new Set(input.addonIds)].map((id) => data.addons.find((a) => a.id === id));
  if (addons.some((a) => !a)) return Response.json({ error: "One of those extras isn't available." }, { status: 400 });

  const items = toItems(services as Service[]);
  const booked = toBookedAddons(addons as Addon[]);
  const duration = totalDuration(items);
  const price = totalPrice(items, booked);

  const phone = toE164(input.phone, countryFor(business.timezone));
  if (!phone || !isMobile(phone)) {
    return Response.json({ error: "Enter a mobile number so we can text your confirmation." }, { status: 400 });
  }

  const options = await loadSlotOptions(business, location, duration);
  if (!isSlotAvailable(input.start, options)) {
    return Response.json({ error: "That time was just taken. Pick another time." }, { status: 409 });
  }

  const admin = createAdminClient();

  // Basic abuse guard: at most 3 bookings per mobile per business per day.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("customer_phone", phone)
    .gte("created_at", dayAgo);
  if ((count ?? 0) >= 3) {
    return Response.json({ error: "You've already booked today. Call us to book more." }, { status: 429 });
  }

  const start = new Date(input.start);
  const end = new Date(start.getTime() + duration * 60_000);
  const status = business.auto_confirm ? "confirmed" : "pending";

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      business_id: business.id,
      location_id: location.id,
      service_id: items[0].service_id,
      service_name: joinNames(items.map((i) => i.name)),
      price_type: price.price_type,
      price_cents: price.price_cents,
      items,
      addons: booked,
      flexible: input.flexible,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      customer_name: input.name,
      customer_phone: phone,
      customer_email: input.email,
      address: input.address,
      notes: input.notes || null,
      answers: input.answers,
      source: parseSource(input.source),
    })
    .select("*")
    .single<Booking>();

  if (error || !booking) {
    // 23P01 = exclusion violation: two people booked the same time at once.
    if (error?.code === "23P01") {
      return Response.json({ error: "That time was just taken. Pick another time." }, { status: 409 });
    }
    console.error("Booking insert failed", error);
    return Response.json({ error: "We couldn't save your booking. Try again or call us." }, { status: 500 });
  }

  after(() => notifyBookingCreated(business, booking));

  return Response.json({ token: booking.manage_token }, { status: 201 });
}
