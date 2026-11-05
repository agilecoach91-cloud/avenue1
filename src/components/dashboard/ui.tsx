import Link from "next/link";
import type { BookingStatus, EnquiryStatus } from "@/lib/types";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="type-display text-[1.75rem] sm:text-[2rem]">{title}</h1>
      {children && <div className="mt-1 max-w-[65ch] text-steel">{children}</div>}
    </div>
  );
}

const BOOKING_STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: "Needs confirming", cls: "bg-wait-soft text-wait" },
  confirmed: { label: "Confirmed", cls: "bg-go-soft text-go" },
  completed: { label: "Done", cls: "bg-surface text-steel" },
  cancelled: { label: "Cancelled", cls: "bg-stop-soft text-stop" },
  no_show: { label: "No-show", cls: "bg-stop-soft text-stop" },
};

const ENQUIRY_STATUS: Record<EnquiryStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-wait-soft text-wait" },
  contacted: { label: "Contacted", cls: "bg-surface text-ink" },
  quoted: { label: "Quoted", cls: "bg-surface text-ink" },
  won: { label: "Won", cls: "bg-go-soft text-go" },
  lost: { label: "Lost", cls: "bg-stop-soft text-stop" },
};

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const s = BOOKING_STATUS[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function EnquiryStatusPill({ status }: { status: EnquiryStatus }) {
  const s = ENQUIRY_STATUS[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="panel p-6">
      <p className="type-heading">{title}</p>
      {children && <div className="mt-1 text-steel">{children}</div>}
    </div>
  );
}

export function Saved({ show, children = "Saved" }: { show: boolean; children?: React.ReactNode }) {
  if (!show) return null;
  return (
    <p role="status" className="mb-4 rounded-md bg-go-soft p-3 text-sm font-semibold text-go">
      {children}
    </p>
  );
}

/** Underlined tabs that are plain links, so each tab has its own URL. */
export function Tabs({
  label,
  items,
  current,
}: {
  label: string;
  items: { id: string; label: string; href: string; count?: number }[];
  current: string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {items.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.id === current ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-semibold ${
            t.id === current ? "border-amber text-ink" : "border-transparent text-steel hover:text-ink"
          }`}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs text-ink">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Flexible() {
  return <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-ink">Flexible on time</span>;
}
