import type { Metadata } from "next";
import Link from "next/link";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { Empty, PageTitle } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { isAfterHours, todayIn } from "@/lib/slots";
import { fromZonedTime } from "date-fns-tz";
import type { Booking } from "@/lib/types";

export const metadata: Metadata = { title: "Today" };

type Props = { searchParams: Promise<{ welcome?: string }> };

function ranges(tz: string) {
  const today = todayIn(tz);
  const nowMs = Date.now();
  return {
    monthStart: fromZonedTime(`${today.slice(0, 8)}01T00:00:00`, tz).toISOString(),
    now: new Date(nowMs).toISOString(),
    weekAhead: new Date(nowMs + 7 * 86_400_000).toISOString(),
  };
}

export default async function DashboardHome({ searchParams }: Props) {
  const { welcome } = await searchParams;
  const { supabase, business } = await requireOwner();
  const tz = business.timezone;
  const { monthStart, now, weekAhead } = ranges(tz);

  const locations = await ownerLocations(supabase, business.id);
  const locName = (id: string | null) => (locations.length > 1 ? (locations.find((l) => l.id === id)?.name ?? null) : null);
  const [upcoming, pending, monthBookings, views, newQuotes, reviews, unread] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("business_id", business.id)
      .in("status", ["confirmed", "pending"])
      .gte("ends_at", now)
      .lte("starts_at", weekAhead)
      .order("starts_at")
      .returns<Booking[]>(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("created_at,status")
      .eq("business_id", business.id)
      .gte("created_at", monthStart),
    supabase
      .from("page_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("kind", "view")
      .gte("created_at", monthStart),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "new"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("review_requested_at", monthStart),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gt("unread_count", 0),
  ]);

  const month = (monthBookings.data ?? []).filter((b) => b.status !== "cancelled");
  const afterHours = month.filter((b) => isAfterHours(new Date(b.created_at as string), tz)).length;
  const pageUrl = `${appUrl()}/${business.slug}`;

  const stats = [
    { label: "Page visits this month", value: views.count ?? 0 },
    { label: "Online bookings this month", value: month.length },
    { label: "Booked after hours", value: afterHours },
    { label: "Review requests sent", value: reviews.count ?? 0 },
  ];

  return (
    <>
      {welcome && (
        <div className="mb-8 rounded-lg bg-ink p-5 text-paper">
          <p className="type-display text-2xl">Your page is live.</p>
          <p className="mt-1 opacity-90">
            Check your prices, then put the link where customers find you.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/services" className="btn btn-primary btn-sm">
              Check my prices
            </Link>
            <Link href="/dashboard/share" className="btn btn-ghost btn-sm">
              Add to Google and Instagram
            </Link>
          </div>
        </div>
      )}

      <PageTitle title={`G'day, ${business.name}`}>
        Your page:{" "}
        <a className="font-semibold text-ink underline" href={pageUrl} target="_blank" rel="noreferrer">
          {pageUrl.replace(/^https?:\/\//, "")}
        </a>
      </PageTitle>

      {((pending.count ?? 0) > 0 || (newQuotes.count ?? 0) > 0 || (unread.count ?? 0) > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(pending.count ?? 0) > 0 && (
            <Link href="/dashboard/bookings?tab=pending" className="btn btn-primary btn-sm">
              {pending.count} booking{pending.count === 1 ? "" : "s"} to confirm
            </Link>
          )}
          {(newQuotes.count ?? 0) > 0 && (
            <Link href="/dashboard/bookings?tab=quotes" className="btn btn-dark btn-sm">
              {newQuotes.count} new quote request{newQuotes.count === 1 ? "" : "s"}
            </Link>
          )}
          {(unread.count ?? 0) > 0 && (
            <Link href="/dashboard/inbox?filter=unread" className="btn btn-ghost btn-sm">
              {unread.count} unread text{unread.count === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}

      <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-l-4 border-amber pl-3">
            <dd className="type-display text-[2rem] leading-none">{s.value}</dd>
            <dt className="mt-1 text-sm text-steel">{s.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="type-heading mb-3 text-lg">Next 7 days</h2>
      {(upcoming.data ?? []).length === 0 ? (
        <Empty title="Nothing booked yet this week.">
          Share your page to start getting online bookings.{" "}
          <Link href="/dashboard/share" className="font-semibold text-ink underline">
            Get your links
          </Link>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {(upcoming.data ?? []).map((b) => (
            <li key={b.id}>
              <BookingCard booking={b} timezone={tz} locationName={locName(b.location_id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
