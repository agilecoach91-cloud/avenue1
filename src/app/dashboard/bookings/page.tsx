import type { Metadata } from "next";
import Link from "next/link";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { Empty, PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import type { Booking } from "@/lib/types";

export const metadata: Metadata = { title: "Bookings" };

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "To confirm" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function BookingsPage({ searchParams }: Props) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.find((f) => f.id === raw)?.id ?? "upcoming";
  const { supabase, business } = await requireOwner();
  const now = new Date().toISOString();

  let q = supabase.from("bookings").select("*").eq("business_id", business.id);
  if (filter === "upcoming") q = q.in("status", ["pending", "confirmed"]).gte("ends_at", now).order("starts_at");
  if (filter === "pending") q = q.eq("status", "pending").order("starts_at");
  if (filter === "past")
    q = q.lt("ends_at", now).in("status", ["confirmed", "completed", "no_show", "pending"]).order("starts_at", { ascending: false });
  if (filter === "cancelled") q = q.eq("status", "cancelled").order("starts_at", { ascending: false });
  const { data } = await q.limit(100).returns<Booking[]>();
  const bookings = data ?? [];

  return (
    <>
      <PageTitle title="Bookings" />
      <nav aria-label="Filter bookings" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/dashboard/bookings?filter=${f.id}`}
            aria-current={f.id === filter ? "page" : undefined}
            className={`btn btn-sm ${f.id === filter ? "btn-dark" : "btn-ghost"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {bookings.length === 0 ? (
        <Empty title={filter === "upcoming" ? "No upcoming bookings." : "Nothing here yet."}>
          {filter === "upcoming" && "New online bookings show up here and are texted to you."}
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <BookingCard booking={b} timezone={business.timezone} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
