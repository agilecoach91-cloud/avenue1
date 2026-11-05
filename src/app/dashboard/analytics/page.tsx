import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ColumnChart, RankedBars, type Point } from "@/components/dashboard/charts";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { PageTitle } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import { todayIn } from "@/lib/slots";
import type { Booking, Enquiry } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

type Props = { searchParams: Promise<{ range?: string; loc?: string }> };

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function countBy<T>(items: T[], key: (t: T) => string | string[] | null): Point[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    for (const one of Array.isArray(k) ? k : k ? [k] : []) counts.set(one, (counts.get(one) ?? 0) + 1);
  }
  return [...counts].map(([label, value]) => ({ label, value }));
}

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (before === 0) return <p className="mt-1 text-xs text-steel">{now > 0 ? `New this period` : `None in the ${label}`}</p>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <p className={`mt-1 text-xs font-semibold ${pct === 0 ? "text-steel" : up ? "text-go" : "text-stop"}`}>
      <span aria-hidden>{pct === 0 ? "" : up ? "▲ " : "▼ "}</span>
      {up ? "+" : ""}
      {pct}% <span className="font-normal text-steel">vs the {label}</span>
    </p>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r.days) === sp.range) ?? RANGES[1];
  const { supabase, business } = await requireOwner();
  const tz = business.timezone;
  const locations = await ownerLocations(supabase, business.id);
  const multi = locations.length > 1;
  const loc = multi && locations.some((l) => l.id === sp.loc) ? sp.loc! : "";

  // Whole local days: today and the N-1 days before it, and the same span before that.
  const today = todayIn(tz);
  const firstDay = addDays(today, -(range.days - 1));
  const start = fromZonedTime(`${firstDay}T00:00:00`, tz);
  const prevStart = fromZonedTime(`${addDays(firstDay, -range.days)}T00:00:00`, tz);

  let bq = supabase.from("bookings").select("*").eq("business_id", business.id).gte("created_at", prevStart.toISOString());
  let eq = supabase.from("enquiries").select("*").eq("business_id", business.id).gte("created_at", prevStart.toISOString());
  if (loc) {
    bq = bq.eq("location_id", loc);
    eq = eq.eq("location_id", loc);
  }
  const [{ data: allBookings }, { data: allQuotes }, { count: visits }] = await Promise.all([
    bq.returns<Booking[]>(),
    eq.returns<Enquiry[]>(),
    supabase
      .from("page_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("kind", "view")
      .gte("created_at", start.toISOString()),
  ]);

  const inRange = (iso: string) => new Date(iso) >= start;
  const live = (allBookings ?? []).filter((b) => b.status !== "cancelled");
  const bookings = live.filter((b) => inRange(b.created_at));
  const prevBookings = live.filter((b) => !inRange(b.created_at));
  const quotes = (allQuotes ?? []).filter((e) => inRange(e.created_at));
  const prevQuotes = (allQuotes ?? []).filter((e) => !inRange(e.created_at));

  // Bookings over time: by day for a week, by week (starting Monday) otherwise.
  const byDay = range.days <= 7;
  const buckets: { key: string; label: string; detail: string }[] = [];
  if (byDay) {
    for (let i = 0; i < range.days; i++) {
      const d = addDays(firstDay, i);
      const at = fromZonedTime(`${d}T12:00:00`, tz);
      buckets.push({ key: d, label: formatInTimeZone(at, tz, "EEE"), detail: formatInTimeZone(at, tz, "EEEE d MMM") });
    }
  } else {
    const mondayOf = (d: string) => {
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
      return addDays(d, -((wd + 6) % 7));
    };
    for (let w = mondayOf(firstDay); w <= today; w = addDays(w, 7)) {
      const at = fromZonedTime(`${w}T12:00:00`, tz);
      buckets.push({ key: w, label: formatInTimeZone(at, tz, "d MMM"), detail: `Week of ${formatInTimeZone(at, tz, "d MMMM")}` });
    }
  }
  const bucketOf = (iso: string) => {
    const d = formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
    if (byDay) return d;
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    return addDays(d, -((wd + 6) % 7));
  };
  const overTime: Point[] = buckets.map((b) => ({
    label: b.label,
    detail: b.detail,
    value: bookings.filter((x) => bucketOf(x.created_at) === b.key).length,
  }));

  const services = countBy(bookings, (b) => (b.items?.length ? b.items.map((i) => i.name) : b.service_name));
  const top = [...services].sort((a, b) => b.value - a.value)[0];
  const serviceMentions = services.reduce((s, x) => s + x.value, 0);
  const sources = countBy([...bookings, ...quotes], (x) => SOURCE_LABELS[parseSource(x.source)]);
  const addons = countBy(bookings, (b) => (b.addons ?? []).map((a) => a.name));
  const withAddons = bookings.filter((b) => (b.addons ?? []).length > 0).length;
  const byLocation = multi
    ? countBy(bookings, (b) => locations.find((l) => l.id === b.location_id)?.name ?? null)
    : [];

  const rangeHref = (days: number) => {
    const q = new URLSearchParams();
    if (days !== 30) q.set("range", String(days));
    if (loc) q.set("loc", loc);
    const s = q.toString();
    return `/dashboard/analytics${s ? `?${s}` : ""}`;
  };
  const periodLabel = `previous ${range.days} days`;

  return (
    <>
      <PageTitle title="Analytics" />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <nav aria-label="Date range" className="flex rounded-md border border-line bg-paper p-0.5">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={rangeHref(r.days)}
              aria-current={r.days === range.days ? "page" : undefined}
              className={`rounded-[7px] px-3 py-1.5 text-sm font-semibold ${r.days === range.days ? "bg-ink text-paper" : "text-steel hover:text-ink"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        {multi && (
          <FilterSelect
            param="loc"
            label="Location"
            value={loc}
            options={[{ value: "", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
          />
        )}
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="panel p-4">
          <dt className="text-sm text-steel">Online bookings</dt>
          <dd className="type-display mt-1 text-[2rem] leading-none">{bookings.length}</dd>
          <Delta now={bookings.length} before={prevBookings.length} label={periodLabel} />
        </div>
        <div className="panel p-4">
          <dt className="text-sm text-steel">Average per day</dt>
          <dd className="type-display mt-1 text-[2rem] leading-none">{(bookings.length / range.days).toFixed(1)}</dd>
          <Delta now={bookings.length} before={prevBookings.length} label={periodLabel} />
        </div>
        <div className="panel p-4">
          <dt className="text-sm text-steel">Quote requests</dt>
          <dd className="type-display mt-1 text-[2rem] leading-none">{quotes.length}</dd>
          <Delta now={quotes.length} before={prevQuotes.length} label={periodLabel} />
        </div>
        <div className="panel p-4">
          <dt className="text-sm text-steel">Most popular service</dt>
          <dd className="type-display mt-1 text-[2rem] leading-none">
            {top ? `${Math.round((top.value / Math.max(1, serviceMentions)) * 100)}%` : "–"}
          </dd>
          <p className="mt-1 truncate text-xs text-steel">{top?.label ?? "No bookings yet"}</p>
        </div>
      </dl>

      <section className="panel mb-5 p-5">
        <h2 className="type-heading">Bookings over time</h2>
        <p className="mb-4 text-sm text-steel">
          {byDay ? "Online bookings made each day" : "Online bookings made each week"}, excluding cancellations.
        </p>
        <ColumnChart title="Bookings over time" points={overTime} unit="bookings" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="type-heading">Where bookings come from</h2>
          <p className="mb-4 text-sm text-steel">
            Bookings and quote requests by the link they came through.
            {visits ? ` ${visits} page visits in this period.` : ""}
          </p>
          <RankedBars title="Where bookings come from" rows={sources} unit="requests" empty="No bookings in this period yet." />
        </section>
        <section className="panel p-5">
          <h2 className="type-heading">By service</h2>
          <p className="mb-4 text-sm text-steel">What customers booked. A booking with two services counts for both.</p>
          <RankedBars title="Bookings by service" rows={services} unit="bookings" empty="No bookings in this period yet." />
        </section>
        <section className="panel p-5">
          <h2 className="type-heading">Add-ons chosen</h2>
          <p className="mb-4 text-sm text-steel">
            {bookings.length
              ? `${withAddons} of ${bookings.length} bookings (${Math.round((withAddons / bookings.length) * 100)}%) added an extra.`
              : "Extras customers added to their booking."}
          </p>
          <RankedBars title="Add-ons chosen" rows={addons} unit="times" empty="No add-ons chosen in this period." />
        </section>
        {multi && (
          <section className="panel p-5">
            <h2 className="type-heading">By location</h2>
            <p className="mb-4 text-sm text-steel">Which locations are getting booked.</p>
            <RankedBars title="Bookings by location" rows={byLocation} unit="bookings" empty="No bookings in this period yet." />
          </section>
        )}
      </div>
    </>
  );
}
