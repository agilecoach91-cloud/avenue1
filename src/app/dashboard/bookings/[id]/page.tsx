import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { openConversation, updateBooking } from "@/app/dashboard/actions";
import { Icon } from "@/components/Icon";
import { MessageLog, type LogRow } from "@/components/dashboard/MessageLog";
import { BookingStatusPill, Flexible } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { formatDay, formatPhone, formatPrice, formatRelative, formatTime } from "@/lib/format";
import { formatAddonPrice } from "@/lib/pricing";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import type { Booking } from "@/lib/types";

export const metadata: Metadata = { title: "Booking" };

function Action({ id, action, label, kind = "ghost" }: { id: string; action: string; label: string; kind?: string }) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={`btn btn-${kind} btn-sm w-full`}>{label}</button>
    </form>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireOwner();
  const { data: b } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Booking>();
  if (!b) notFound();
  const tz = business.timezone;
  const locations = await ownerLocations(supabase, business.id);
  const location = locations.length > 1 ? locations.find((l) => l.id === b.location_id) : null;
  const { data: log } = await supabase
    .from("message_log")
    .select("id,kind,channel,status,error,created_at")
    .eq("booking_id", b.id)
    .order("created_at")
    .returns<LogRow[]>();
  const past = new Date(b.ends_at) < new Date();
  const active = b.status === "pending" || b.status === "confirmed";
  const answers = Object.entries(b.answers ?? {});
  const first = b.customer_name.split(" ")[0];

  return (
    <>
      <Link href="/dashboard/bookings" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-steel hover:text-ink">
        <Icon name="left" size={16} /> Bookings
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="type-display text-[1.6rem] sm:text-[2rem]">{b.service_name}</h1>
        <BookingStatusPill status={b.status} />
        {b.flexible && <Flexible />}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <section className="panel p-5">
          <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-[9rem_1fr]">
            <dt className="text-steel">When</dt>
            <dd className="font-semibold">
              {formatDay(b.starts_at, tz)}
              <span className="block font-normal">
                {formatTime(b.starts_at, tz)} to {formatTime(b.ends_at, tz)}
                {b.flexible ? ". The customer is flexible on the time." : ""}
              </span>
            </dd>
            <dt className="text-steel">Customer</dt>
            <dd>
              <span className="font-semibold">{b.customer_name}</span>
              <a className="block underline" href={`tel:${b.customer_phone}`}>
                {formatPhone(b.customer_phone)}
              </a>
              {b.customer_email && (
                <a className="block underline" href={`mailto:${b.customer_email}`}>
                  {b.customer_email}
                </a>
              )}
            </dd>
            {b.address && (
              <>
                <dt className="text-steel">Job address</dt>
                <dd>
                  <a className="underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}>
                    {b.address}
                  </a>
                </dd>
              </>
            )}
            {location && (
              <>
                <dt className="text-steel">Location</dt>
                <dd>{location.name}</dd>
              </>
            )}
            <dt className="text-steel">{b.items.length > 1 ? "Services" : "Service"}</dt>
            <dd>
              <ul className="grid gap-0.5">
                {(b.items.length ? b.items : [{ service_id: "", name: b.service_name, price_type: b.price_type ?? "quote", price_cents: b.price_cents, duration_min: 0 }]).map((i) => (
                  <li key={`${i.service_id}${i.name}`} className="flex justify-between gap-4">
                    <span>{i.name}</span>
                    <span className="tabular-nums">{formatPrice(i.price_type, i.price_cents)}</span>
                  </li>
                ))}
              </ul>
            </dd>
            {b.addons.length > 0 && (
              <>
                <dt className="text-steel">Extras</dt>
                <dd>
                  <ul className="grid gap-0.5">
                    {b.addons.map((a) => (
                      <li key={a.addon_id} className="flex justify-between gap-4">
                        <span>{a.name}</span>
                        <span className="tabular-nums">{formatAddonPrice(a)}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
            <dt className="text-steel">Total</dt>
            <dd className="type-heading">{formatPrice(b.price_type, b.price_cents)}</dd>
            {answers.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {b.notes && (
              <>
                <dt className="text-steel">Notes</dt>
                <dd className="whitespace-pre-line">{b.notes}</dd>
              </>
            )}
            <dt className="text-steel">Booked via</dt>
            <dd>
              {SOURCE_LABELS[parseSource(b.source)]}, {formatRelative(b.created_at, tz).toLowerCase()}
            </dd>
          </dl>
        </section>

        <aside className="grid content-start gap-4">
          <div className="panel grid gap-2 p-4">
            <p className="type-heading mb-1">Actions</p>
            {b.status === "pending" && <Action id={b.id} action="confirm" label="Confirm booking" kind="primary" />}
            {active && <Action id={b.id} action="complete" label="Mark job done" kind="dark" />}
            {active && past && <Action id={b.id} action="no_show" label="Customer didn't show" />}
            {active && !past && <Action id={b.id} action="cancel" label="Cancel booking" kind="danger" />}
            <form action={openConversation}>
              <input type="hidden" name="phone" value={b.customer_phone} />
              <input type="hidden" name="name" value={b.customer_name} />
              <input type="hidden" name="location" value={b.location_id ?? ""} />
              <button className="btn btn-ghost btn-sm w-full">
                <Icon name="message" size={18} /> Text {first}
              </button>
            </form>
            {b.status === "completed" && (
              <p className="hint">
                {b.review_requested_at ? "Google review request sent." : "We'll send a Google review request shortly."}
              </p>
            )}
          </div>
          <MessageLog rows={log ?? []} timezone={tz} />
        </aside>
      </div>
    </>
  );
}
