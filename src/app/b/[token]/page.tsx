import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { BusinessMark, PublicShell } from "@/components/public/PublicShell";
import { formatDay, formatPhone, formatPrice, formatTime } from "@/lib/format";
import { notifyBookingCancelled } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking, Business } from "@/lib/types";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> };

async function load(token: string) {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("*").eq("manage_token", token).maybeSingle<Booking>();
  if (!booking) return null;
  const { data: business } = await admin
    .from("businesses")
    .select("*")
    .eq("id", booking.business_id)
    .single<Business>();
  return business ? { booking, business } : null;
}

async function cancelBooking(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const data = await load(token);
  if (!data) return;
  const { booking, business } = data;
  if (!["pending", "confirmed"].includes(booking.status) || new Date(booking.starts_at) < new Date()) return;
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id)
    .select("*")
    .single<Booking>();
  if (updated) after(() => notifyBookingCancelled(business, updated, true));
  revalidatePath(`/b/${token}`);
}

const STATUS_TEXT: Record<Booking["status"], string> = {
  pending: "Waiting for the business to confirm",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

export default async function ManageBookingPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  const data = await load(token);
  if (!data) notFound();
  const { booking, business } = data;
  const tz = business.timezone;
  const active = ["pending", "confirmed"].includes(booking.status) && new Date(booking.starts_at) > new Date();

  return (
    <PublicShell business={business} back={{ href: `/${business.slug}`, label: business.name }}>
      {isNew && booking.status !== "cancelled" && (
        <div role="status" className="mb-6 rounded-lg p-4" style={{ background: "var(--brand)", color: "var(--brand-ink)" }}>
          <p className="type-display text-2xl">
            {booking.status === "confirmed" ? "You're booked." : "Request sent."}
          </p>
          <p className="mt-1">
            {booking.status === "confirmed"
              ? "We've texted you the details. You'll get a reminder the day before."
              : `${business.name} will confirm your time by text.`}
          </p>
        </div>
      )}

      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <BusinessMark business={business} size={44} />
          <div>
            <p className="type-heading">{business.name}</p>
            {business.phone && (
              <a className="text-sm text-steel underline" href={`tel:${business.phone}`}>
                {formatPhone(business.phone)}
              </a>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5">
          <dt className="text-steel">Service</dt>
          <dd className="font-semibold">{booking.service_name}</dd>
          <dt className="text-steel">When</dt>
          <dd className="font-semibold">
            {formatDay(booking.starts_at, tz)}
            <br />
            {formatTime(booking.starts_at, tz)} to {formatTime(booking.ends_at, tz)}
          </dd>
          {booking.address && (
            <>
              <dt className="text-steel">Where</dt>
              <dd>{booking.address}</dd>
            </>
          )}
          {booking.price_type && (
            <>
              <dt className="text-steel">Price</dt>
              <dd>{formatPrice(booking.price_type, booking.price_cents)}</dd>
            </>
          )}
          <dt className="text-steel">Status</dt>
          <dd>{STATUS_TEXT[booking.status]}</dd>
        </dl>

        {active && (
          <div className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-ghost btn-sm" href={`/api/public/bookings/${token}/ics`}>
              Add to calendar
            </a>
            <form action={cancelBooking}>
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-danger btn-sm">Cancel booking</button>
            </form>
          </div>
        )}
        {active && (
          <p className="hint mt-3">
            To change the time, cancel and book again{business.phone ? `, or call ${formatPhone(business.phone)}` : ""}.
          </p>
        )}
      </div>
    </PublicShell>
  );
}
