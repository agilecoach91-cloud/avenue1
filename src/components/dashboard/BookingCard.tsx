import Link from "next/link";
import { updateBooking } from "@/app/dashboard/actions";
import { formatPhone, formatPrice, formatShortDay, formatTime } from "@/lib/format";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import type { Booking } from "@/lib/types";
import { BookingStatusPill, Flexible } from "./ui";

function Action({ id, action, label, kind = "ghost" }: { id: string; action: string; label: string; kind?: string }) {
  return (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={`btn btn-${kind} btn-sm`}>{label}</button>
    </form>
  );
}

export function BookingCard({
  booking: b,
  timezone,
  locationName,
}: {
  booking: Booking;
  timezone: string;
  /** Shown when the business has more than one location. */
  locationName?: string | null;
}) {
  const past = new Date(b.ends_at) < new Date();
  const answers = Object.entries(b.answers ?? {});
  return (
    <article className="panel grid gap-3 p-4 sm:grid-cols-[9rem_1fr] sm:gap-5 sm:p-5">
      <div>
        <p className="type-heading">{formatShortDay(b.starts_at, timezone)}</p>
        <p className="type-display text-xl">{formatTime(b.starts_at, timezone)}</p>
        <p className="text-sm text-steel">until {formatTime(b.ends_at, timezone)}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="type-heading text-[1.05rem]">
            <Link href={`/dashboard/bookings/${b.id}`} className="hover:underline">
              {b.service_name}
            </Link>
          </h3>
          <BookingStatusPill status={b.status} />
          {b.flexible && <Flexible />}
        </div>
        <p className="mt-1">
          {b.customer_name},{" "}
          <a className="font-semibold underline" href={`tel:${b.customer_phone}`}>
            {formatPhone(b.customer_phone)}
          </a>
          {b.customer_email && (
            <>
              ,{" "}
              <a className="underline" href={`mailto:${b.customer_email}`}>
                {b.customer_email}
              </a>
            </>
          )}
        </p>
        {b.address && (
          <p className="text-steel">
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
            >
              {b.address}
            </a>
          </p>
        )}
        {(b.addons?.length > 0 || locationName) && (
          <p className="mt-1 text-sm">
            {locationName && <span className="font-semibold">{locationName}. </span>}
            {b.addons?.length > 0 && <span>Extras: {b.addons.map((a) => a.name).join(", ")}</span>}
          </p>
        )}
        {(answers.length > 0 || b.notes) && (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
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
          </dl>
        )}
        <p className="mt-2 text-xs text-mist">
          {formatPrice(b.price_type, b.price_cents)}. Booked via {SOURCE_LABELS[parseSource(b.source)]}.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {b.status === "pending" && <Action id={b.id} action="confirm" label="Confirm" kind="primary" />}
          {(b.status === "confirmed" || b.status === "pending") && past && (
            <>
              <Action id={b.id} action="complete" label="Mark done" kind="dark" />
              <Action id={b.id} action="no_show" label="No-show" />
            </>
          )}
          {(b.status === "confirmed" || b.status === "pending") && !past && (
            <Action id={b.id} action="cancel" label="Cancel" kind="danger" />
          )}
          {b.status === "confirmed" && !past && (
            <Action id={b.id} action="complete" label="Mark done" />
          )}
        </div>
      </div>
    </article>
  );
}
