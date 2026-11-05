// Sample data for the demo: Harbour Pest Co., two locations, a few months of
// bookings, live inbox threads and quote requests. Times are relative to now.
import { fromZonedTime } from "date-fns-tz";
import { formatWhen } from "@/lib/format";
import { joinNames, toBookedAddons, toItems, totalDuration, totalPrice } from "@/lib/pricing";
import { todayIn } from "@/lib/slots";
import { DEFAULT_HOURS, templateFor } from "@/lib/templates";
import type { Addon, Service } from "@/lib/types";
import { registerUser } from "./auth";
import { tables } from "./db";
import { clearStorage } from "./storage";
import { hexToken, uuid } from "./util";

export const SAMPLE_OWNER_ID = "5a3f2c1e-8b7d-4e6a-9c2b-1d0e3f4a5b6c";
export const SAMPLE_OWNER_EMAIL = "dave@example.com";
export const SAMPLE_SLUG = "harbour-pest";
const TZ = "Australia/Sydney";
const APP = "https://yourdomain.com.au";

type Row = Record<string, unknown>;

/** Small deterministic random generator, so the sample looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Jess", "Liam", "Olivia", "Noah", "Mia", "Jack", "Chloe", "Ethan", "Grace", "Lucas", "Ruby", "Oscar", "Zoe", "Henry", "Ella", "Leo", "Sienna", "Max", "Isla", "Archie", "Amelia", "Tom", "Hannah", "Sam"];
const LAST = ["Nguyen", "Smith", "Patel", "Williams", "Brown", "Wilson", "Taylor", "Kelly", "Martin", "Clarke", "Murray", "Walsh", "Singh", "Lee", "Harris", "Ryan", "Cooper", "Hughes", "Bell", "Murphy"];
const STREETS = ["Ocean St", "Pittwater Rd", "Lagoon St", "Bay Rd", "Albert Ave", "Victoria Ave", "Pacific Hwy", "Fisher Rd", "Oaks Ave", "Howard Ave", "Penshurst St", "Mowbray Rd"];
const SUBURBS_A = ["Dee Why NSW", "Collaroy NSW", "Narrabeen NSW", "Manly NSW", "Mona Vale NSW", "Freshwater NSW"];
const SUBURBS_B = ["Chatswood NSW", "Willoughby NSW", "Lane Cove NSW", "Artarmon NSW", "Roseville NSW", "Lindfield NSW"];

export function seed(): { businessId: string } {
  for (const k of Object.keys(tables)) tables[k] = [];
  clearStorage();
  registerUser(SAMPLE_OWNER_ID, SAMPLE_OWNER_EMAIL);

  const rand = rng(20261105);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const weighted = <T,>(pairs: [T, number][]) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [v, w] of pairs) {
      if ((r -= w) <= 0) return v;
    }
    return pairs[pairs.length - 1][0];
  };
  const now = Date.now();
  const today = todayIn(TZ);
  const addDays = (d: string, n: number) => {
    const [y, m, dd] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
  };
  const weekday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
  const isWorkday = (d: string) => weekday(d) >= 1 && weekday(d) <= 5;
  const at = (d: string, hhmm: string) => fromZonedTime(`${d}T${hhmm}:00`, TZ).toISOString();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const workdays = (dir: 1 | -1, count: number) => {
    const out: string[] = [];
    let d = today;
    while (out.length < count) {
      d = addDays(d, dir);
      if (isWorkday(d)) out.push(d);
    }
    return out;
  };
  const phone = () => `+614${String(Math.floor(rand() * 1e8)).padStart(8, "0")}`;

  // Business and locations
  const businessId = uuid();
  const business: Row = {
    id: businessId,
    owner_id: SAMPLE_OWNER_ID,
    slug: SAMPLE_SLUG,
    name: "Harbour Pest Co.",
    trade: "pest_control",
    tagline: "Licensed pest control on the Northern Beaches and North Shore.",
    about: "Family-owned since 2009. Pet-safe treatments, a 12-month warranty on general pest work, and a written report for every inspection.",
    phone: "+61412345678",
    email: SAMPLE_OWNER_EMAIL,
    service_area: "Northern Beaches and North Shore",
    address: null,
    licence_number: "NSW Pest Lic. 5100123",
    abn: null,
    timezone: TZ,
    brand_color: "#1f6f5c",
    logo_url: null,
    cover_url: null,
    google_place_id: "demo-harbour-pest",
    google_review_url: "https://search.google.com/local/writereview?placeid=demo-harbour-pest",
    google_rating: 4.9,
    google_review_count: 212,
    instagram_url: "https://instagram.com/harbourpest.demo",
    facebook_url: null,
    website_url: null,
    booking_window_days: 28,
    slot_interval_min: 30,
    auto_confirm: true,
    review_delay_hours: 0,
    notify_owner_sms: true,
    notify_owner_email: true,
    plan: "starter",
    published: true,
    ics_token: hexToken(),
    created_at: hoursAgo(24 * 200),
    updated_at: hoursAgo(24 * 2),
  };
  tables.businesses.push(business);

  const locA: Row = {
    id: uuid(), business_id: businessId, name: "Northern Beaches", address: "4/12 Middleton Rd, Dee Why NSW 2099",
    phone: null, lead_time_hours: 2, daily_limits: { "6": 3 }, sort: 0, active: true, created_at: hoursAgo(24 * 200),
  };
  const locB: Row = {
    id: uuid(), business_id: businessId, name: "North Shore", address: "18 Albert Ave, Chatswood NSW 2067",
    phone: null, lead_time_hours: 4, daily_limits: { "1": 4, "2": 4, "3": 4, "4": 4, "5": 4 }, sort: 1, active: true,
    created_at: hoursAgo(24 * 120),
  };
  tables.locations.push(locA, locB);
  for (const h of DEFAULT_HOURS) tables.availability.push({ id: uuid(), business_id: businessId, location_id: locA.id, ...h });
  for (const weekdayNo of [1, 2, 3, 4, 5]) {
    tables.availability.push({ id: uuid(), business_id: businessId, location_id: locB.id, weekday: weekdayNo, start_minute: 8 * 60, end_minute: 17 * 60 });
  }
  const expo = workdays(1, 12)[11];
  tables.time_off.push({
    id: uuid(), business_id: businessId, location_id: locA.id, starts_at: at(expo, "00:00"), ends_at: at(addDays(expo, 1), "00:00"), note: "Pest industry expo",
  });

  // Services and add-ons from the pest control template
  const template = templateFor("pest_control");
  const services = template.services.map((s, i) => ({
    id: uuid(), business_id: businessId, name: s.name, description: s.description ?? null, price_type: s.price_type,
    price_cents: s.price_cents ?? null, duration_min: s.duration_min, booking_mode: s.booking_mode,
    questions: s.questions ?? [], repeat_months: s.repeat_months ?? null, icon: s.icon, sort: i, active: true,
    created_at: hoursAgo(24 * 200),
  })) as unknown as Service[];
  const addons = template.addons.map((a, i) => ({
    id: uuid(), business_id: businessId, name: a.name, description: a.description ?? null, price_cents: a.price_cents ?? null,
    price_note: a.price_note ?? null, icon: a.icon, sort: i, active: true, created_at: hoursAgo(24 * 200),
  })) as unknown as Addon[];
  tables.services.push(...(services as unknown as Row[]));
  tables.addons.push(...(addons as unknown as Row[]));
  const svc = (name: string) => services.find((s) => s.name === name)!;
  const addon = (name: string) => addons.find((a) => a.name.startsWith(name))!;

  // Bookings
  const makeBooking = (o: {
    loc: Row; services: Service[]; addons?: Addon[]; start: string; status: string; name: string; phone?: string;
    email?: string | null; address?: string; source: string; created: string; answers?: Record<string, string>;
    notes?: string | null; flexible?: boolean; extra?: Row;
  }): Row => {
    const items = toItems(o.services);
    const booked = toBookedAddons(o.addons ?? []);
    const price = totalPrice(items, booked);
    const end = new Date(new Date(o.start).getTime() + totalDuration(items) * 60_000).toISOString();
    const row: Row = {
      id: uuid(), business_id: businessId, location_id: o.loc.id, service_id: items[0].service_id,
      service_name: joinNames(items.map((i) => i.name)), price_type: price.price_type, price_cents: price.price_cents,
      items, addons: booked, flexible: o.flexible ?? false, starts_at: o.start, ends_at: end, status: o.status,
      customer_name: o.name, customer_phone: o.phone ?? phone(), customer_email: o.email ?? null,
      address: o.address ?? `${1 + Math.floor(rand() * 98)} ${pick(STREETS)}, ${pick(o.loc === locA ? SUBURBS_A : SUBURBS_B)}`,
      answers: o.answers ?? {}, notes: o.notes ?? null, source: o.source, manage_token: hexToken(),
      confirmed_at: o.status === "pending" ? null : o.created, completed_at: null, cancelled_at: null,
      reminder_24h_at: null, reminder_1h_at: null, review_requested_at: null, created_at: o.created, ...(o.extra ?? {}),
    };
    tables.bookings.push(row);
    return row;
  };

  // History: the last 90 days, growing a little week on week.
  const svcWeights: [Service, number][] = [
    [svc("General pest treatment"), 45], [svc("Termite inspection"), 25], [svc("Pre-purchase pest inspection"), 15], [svc("Rodent control"), 15],
  ];
  const srcWeights: [string, number][] = [["google", 44], ["instagram", 16], ["website", 15], ["facebook", 8], ["qr", 7], ["direct", 10]];
  const slotsA = ["07:30", "10:00", "13:00"];
  const slotsB = ["08:00", "10:30", "13:30"];
  for (let back = 90; back >= 3; back--) {
    const d = addDays(today, -back);
    if (!isWorkday(d)) continue;
    const growth = 0.55 + (90 - back) / 160;
    for (const loc of [locA, locB]) {
      const times = loc === locA ? slotsA : slotsB;
      for (const time of times) {
        if (rand() > growth * (loc === locA ? 0.62 : 0.42)) continue;
        const service = weighted(svcWeights);
        const extras = rand() < 0.3 ? [pick(addons)] : [];
        const start = at(d, time);
        const created = new Date(new Date(start).getTime() - (1 + Math.floor(rand() * 5)) * 86_400_000 - Math.floor(rand() * 10) * 3_600_000).toISOString();
        const status = weighted<string>([["completed", 90], ["no_show", 4], ["cancelled", 6]]);
        const first = pick(FIRST);
        makeBooking({
          loc, services: [service], addons: extras, start, status, name: `${first} ${pick(LAST)}`, source: weighted(srcWeights), created,
          answers: service.questions.length ? { "Property type": pick(["House", "House", "Townhouse", "Unit / apartment"]) } : {},
          extra: status === "completed"
            ? { completed_at: new Date(new Date(start).getTime() + 2 * 3_600_000).toISOString(), review_requested_at: new Date(new Date(start).getTime() + 2 * 3_600_000).toISOString() }
            : status === "cancelled" ? { cancelled_at: created } : {},
        });
      }
    }
  }

  // Recent and upcoming jobs
  const [w1, w2, w3] = workdays(1, 3);
  const [p1, p2] = workdays(-1, 2);
  const tom = makeBooking({ loc: locA, services: [svc("General pest treatment")], start: at(w1, "07:30"), status: "confirmed", name: "Tom Becker", phone: "+61400777888", source: "website", created: hoursAgo(26), answers: { "Property type": "House", "How many storeys?": "1" } });
  const marco = makeBooking({ loc: locA, services: [svc("Termite inspection")], start: at(w1, "10:00"), status: "pending", name: "Marco Rossi", phone: "+61400111222", source: "google", created: hoursAgo(3), answers: { "Property type": "House" }, notes: "Side gate is unlocked", flexible: true });
  makeBooking({ loc: locB, services: [svc("Pre-purchase pest inspection")], addons: [addon("Written report")], start: at(w1, "09:00"), status: "confirmed", name: "Sophie Martin", phone: "+61400555123", email: "sophie@example.com", source: "google", created: at(addDays(today, -1), "21:42"), answers: { "Property type": "Unit / apartment", "Settlement or cooling-off date": "Settlement 28 November" } });
  const priya = makeBooking({ loc: locA, services: [svc("General pest treatment")], addons: [addon("Wasp nest")], start: at(w2, "13:30"), status: "confirmed", name: "Priya Shah", phone: "+61400333444", email: "priya@example.com", source: "instagram", created: hoursAgo(30), answers: { "Property type": "Townhouse", "How many storeys?": "2" } });
  makeBooking({ loc: locB, services: [svc("Rodent control")], addons: [addon("Rodent bait")], start: at(w2, "08:00"), status: "confirmed", name: "Hamish Grant", phone: "+61400222333", source: "facebook", created: hoursAgo(20), answers: { "Property type": "House" } });
  makeBooking({ loc: locB, services: [svc("Termite inspection"), svc("General pest treatment")], start: at(w3, "13:00"), status: "confirmed", name: "Olivia Chen", phone: "+61400888999", email: "olivia@example.com", source: "google", created: hoursAgo(9), answers: { "Property type": "House", "How many storeys?": "2" } });
  makeBooking({ loc: locA, services: [svc("Termite inspection")], start: at(w2, "08:00"), status: "cancelled", name: "Chris Wong", source: "google", created: hoursAgo(50), extra: { cancelled_at: hoursAgo(20) } });
  const lena = makeBooking({ loc: locA, services: [svc("Termite inspection")], start: at(p1, "10:00"), status: "completed", name: "Lena Ford", phone: "+61400999000", source: "google", created: hoursAgo(24 * 6), answers: { "Property type": "House" }, extra: { completed_at: at(p1, "12:10"), review_requested_at: at(p1, "12:10") } });
  makeBooking({ loc: locB, services: [svc("Rodent control")], start: at(p1, "14:00"), status: "confirmed", name: "Jack O'Brien", phone: "+61400444555", source: "qr", created: hoursAgo(24 * 4), answers: { "Property type": "Townhouse" } });
  makeBooking({ loc: locA, services: [svc("General pest treatment")], addons: [addon("Spider")], start: at(p2, "08:00"), status: "completed", name: "Aisha Khan", source: "facebook", created: hoursAgo(24 * 8), answers: { "Property type": "House", "How many storeys?": "2" }, extra: { completed_at: at(p2, "09:40"), review_requested_at: at(p2, "09:40") } });

  // Quote requests
  const makeQuote = (o: { loc: Row; service: Service | null; name: string; phone?: string; email?: string | null; address: string | null; message: string; status: string; source: string; created: string }): Row => {
    const row: Row = {
      id: uuid(), business_id: businessId, location_id: o.loc.id, service_id: o.service?.id ?? null, service_name: o.service?.name ?? null,
      items: o.service ? toItems([o.service]) : [], addons: [], customer_name: o.name, customer_phone: o.phone ?? phone(),
      customer_email: o.email ?? null, address: o.address, message: o.message, answers: {}, photo_paths: [], status: o.status,
      source: o.source, created_at: o.created,
    };
    tables.enquiries.push(row);
    return row;
  };
  const dan = makeQuote({ loc: locA, service: svc("Termite treatment"), name: "Dan Murphy", phone: "+61400555666", email: "dan@example.com", address: "Dee Why NSW", message: "Found mud tubes along the garage wall. Brick veneer, built in the 1990s. Can you take a look this week?", status: "new", source: "website", created: hoursAgo(5) });
  makeQuote({ loc: locA, service: null, name: "Grace Lee", phone: "+61400666777", address: "Manly NSW", message: "Wasp nest under the eaves of a two-storey house. Can you remove it this week?", status: "contacted", source: "instagram", created: hoursAgo(48) });
  for (let i = 0; i < 7; i++) {
    makeQuote({
      loc: rand() < 0.6 ? locA : locB, service: svc("Termite treatment"), name: `${pick(FIRST)} ${pick(LAST)}`, address: pick([...SUBURBS_A, ...SUBURBS_B]),
      message: pick(["Termite damage found in the skirting boards.", "Need a quote for a chemical barrier on a new build.", "Building inspector flagged termite activity in the subfloor."]),
      status: pick(["quoted", "won", "won", "lost"]), source: weighted(srcWeights), created: hoursAgo(24 * (6 + Math.floor(rand() * 80))),
    });
  }

  // Inbox threads and the log of automatic messages for the live jobs
  const name = business.name as string;
  const url = (b: Row) => `${APP}/b/${b.manage_token}`;
  const when = (b: Row) => formatWhen(b.starts_at as string, TZ);
  const thread = (b: Row | null, phoneNo: string, customer: string, loc: Row, msgs: { dir: "in" | "out"; body: string; kind?: string; ago: number; logKind?: string; bookingId?: string; enquiryId?: string }[], unread = 0) => {
    const convId = uuid();
    for (const m of msgs) {
      const created = hoursAgo(m.ago);
      tables.messages.push({ id: uuid(), conversation_id: convId, business_id: businessId, direction: m.dir, body: m.body, kind: m.kind ?? null, status: m.dir === "in" ? "received" : "sent", error: null, provider_id: null, created_at: created });
      if (m.dir === "out") {
        tables.message_log.push({ id: uuid(), business_id: businessId, booking_id: m.bookingId ?? (b?.id as string) ?? null, enquiry_id: m.enquiryId ?? null, kind: m.logKind ?? m.kind ?? "inbox_reply", channel: "sms", recipient: phoneNo, body: m.body, status: "sent", provider_id: null, error: null, created_at: created });
      }
    }
    const last = msgs[msgs.length - 1];
    tables.conversations.push({ id: convId, business_id: businessId, location_id: loc.id, customer_phone: phoneNo, customer_name: customer, last_message_at: hoursAgo(last.ago), last_message_preview: last.body.slice(0, 140), unread_count: unread, created_at: hoursAgo(msgs[0].ago) });
  };

  thread(marco, marco.customer_phone as string, "Marco Rossi", locA, [
    { dir: "out", kind: "booking_received", body: `${name}: we've got your request for Termite inspection, ${when(marco)}. We'll confirm shortly. Details: ${url(marco)}`, ago: 3 },
    { dir: "in", body: "Hi, is it ok if I'm not home? Side gate will be open and the dog will be inside.", ago: 2.4 },
  ], 1);
  thread(priya, priya.customer_phone as string, "Priya Shah", locA, [
    { dir: "out", kind: "booking_confirmed", body: `${name}: you're booked for General pest treatment, ${when(priya)}. Change or cancel: ${url(priya)}`, ago: 30 },
    { dir: "in", body: "Thanks! Do I need to be home for the treatment?", ago: 28 },
    { dir: "out", body: "Hi Priya, no need. Just leave the side gate open and keep the cat inside for two hours after. Dave", ago: 27.5 },
    { dir: "in", body: "Perfect, thank you", ago: 27.2 },
  ]);
  thread(tom, tom.customer_phone as string, "Tom Becker", locA, [
    { dir: "out", kind: "booking_confirmed", body: `${name}: you're booked for General pest treatment, ${when(tom)}. Change or cancel: ${url(tom)}`, ago: 26 },
  ]);
  thread(null, dan.customer_phone as string, "Dan Murphy", locA, [
    { dir: "out", kind: "enquiry_received", logKind: "enquiry_received", enquiryId: dan.id as string, body: `${name}: thanks Dan, we've got your quote request for Termite treatment. We'll text you back soon.`, ago: 5 },
    { dir: "in", body: "Thanks. It's mostly along the back wall of the garage. Mornings suit me best.", ago: 4.5 },
  ], 1);
  thread(lena, lena.customer_phone as string, "Lena Ford", locA, [
    { dir: "out", kind: "booking_confirmed", body: `${name}: you're booked for Termite inspection, ${when(lena)}. Change or cancel: ${url(lena)}`, ago: 24 * 6 },
    { dir: "out", kind: "review_request", body: `Thanks Lena! If you were happy with ${name}, a quick Google review helps a lot: ${business.google_review_url}`, ago: 24 * 1.5 },
    { dir: "in", body: "Done! Great job, thanks Dave", ago: 24 * 1.4 },
  ]);

  // Page visits over the last 90 days
  for (let back = 0; back < 90; back++) {
    const visits = Math.round((2 + rand() * 4) * (0.6 + (90 - back) / 150));
    for (let v = 0; v < visits; v++) {
      tables.page_events.push({ id: uuid(), business_id: businessId, kind: "view", source: weighted(srcWeights), created_at: hoursAgo(back * 24 + rand() * 20) });
    }
  }

  return { businessId };
}
