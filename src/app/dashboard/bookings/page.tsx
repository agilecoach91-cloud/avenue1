import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { BookingStatusPill, Empty, EnquiryStatusPill, Flexible, PageTitle, Tabs } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { formatPhone, formatRelative, formatRelativeDay } from "@/lib/format";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import type { Booking, Enquiry } from "@/lib/types";

export const metadata: Metadata = { title: "Bookings" };

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "pending", label: "To confirm" },
  { id: "quotes", label: "Quote requests" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = { searchParams: Promise<{ tab?: string; filter?: string; loc?: string; q?: string }> };

type Row = {
  key: string;
  href: string;
  received: string;
  status: React.ReactNode;
  name: string;
  phone: string;
  when: string | null;
  what: string;
  extras: number;
  flexible: boolean;
  locationId: string | null;
  source: string;
};

export default async function BookingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab: TabId = TABS.find((t) => t.id === (sp.tab ?? sp.filter))?.id ?? "upcoming";
  const { supabase, business } = await requireOwner();
  const tz = business.timezone;
  const locations = await ownerLocations(supabase, business.id);
  const multi = locations.length > 1;
  const loc = multi && locations.some((l) => l.id === sp.loc) ? sp.loc! : "";
  const search = (sp.q ?? "").trim().toLowerCase();
  const now = new Date();
  const nowIso = now.toISOString();

  const wantBookings = tab !== "quotes";
  const wantQuotes = tab === "quotes" || tab === "all";

  let bookings: Booking[] = [];
  if (wantBookings) {
    let q = supabase.from("bookings").select("*").eq("business_id", business.id);
    if (loc) q = q.eq("location_id", loc);
    if (tab === "upcoming") q = q.in("status", ["pending", "confirmed"]).gte("ends_at", nowIso).order("starts_at");
    if (tab === "pending") q = q.eq("status", "pending").order("starts_at");
    if (tab === "past")
      q = q.lt("ends_at", nowIso).in("status", ["confirmed", "completed", "no_show", "pending"]).order("starts_at", { ascending: false });
    if (tab === "cancelled") q = q.eq("status", "cancelled").order("starts_at", { ascending: false });
    if (tab === "today" || tab === "all") q = q.order("starts_at", { ascending: tab === "today" });
    const { data } = await q.limit(200).returns<Booking[]>();
    bookings = data ?? [];
    if (tab === "today") bookings = bookings.filter((b) => formatRelativeDay(b.starts_at, tz, now) === "Today");
  }

  let quotes: Enquiry[] = [];
  if (wantQuotes) {
    let q = supabase.from("enquiries").select("*").eq("business_id", business.id);
    if (loc) q = q.eq("location_id", loc);
    const { data } = await q.order("created_at", { ascending: false }).limit(200).returns<Enquiry[]>();
    quotes = data ?? [];
  }

  const { count: pendingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "pending");
  const { count: newQuotes } = await supabase
    .from("enquiries")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "new");

  let rows: Row[] = [
    ...bookings.map((b) => ({
      key: `b-${b.id}`,
      href: `/dashboard/bookings/${b.id}`,
      received: b.created_at,
      status: <BookingStatusPill status={b.status} />,
      name: b.customer_name,
      phone: b.customer_phone,
      when: formatRelative(b.starts_at, tz, now),
      what: b.service_name,
      extras: b.addons?.length ?? 0,
      flexible: b.flexible,
      locationId: b.location_id,
      source: SOURCE_LABELS[parseSource(b.source)],
    })),
    ...quotes.map((e) => ({
      key: `q-${e.id}`,
      href: `/dashboard/enquiries/${e.id}`,
      received: e.created_at,
      status: <EnquiryStatusPill status={e.status} />,
      name: e.customer_name,
      phone: e.customer_phone,
      when: null,
      what: e.service_name ?? "General enquiry",
      extras: e.addons?.length ?? 0,
      flexible: false,
      locationId: e.location_id,
      source: SOURCE_LABELS[parseSource(e.source)],
    })),
  ];
  if (tab === "all") rows.sort((a, b) => (a.received < b.received ? 1 : -1));
  if (search) {
    const digits = search.replace(/\D/g, "");
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.what.toLowerCase().includes(search) ||
        (digits.length >= 3 && (r.phone.includes(digits) || formatPhone(r.phone).replace(/\D/g, "").includes(digits))),
    );
  }
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "";

  const href = (t: string) => {
    const q = new URLSearchParams();
    if (t !== "upcoming") q.set("tab", t);
    if (loc) q.set("loc", loc);
    const s = q.toString();
    return `/dashboard/bookings${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageTitle title="Bookings and quotes" />
      <Tabs
        label="Filter bookings"
        current={tab}
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          href: href(t.id),
          count: t.id === "pending" ? (pendingCount ?? 0) : t.id === "quotes" ? (newQuotes ?? 0) : undefined,
        }))}
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/dashboard/bookings">
        {tab !== "upcoming" && <input type="hidden" name="tab" value={tab} />}
        {loc && <input type="hidden" name="loc" value={loc} />}
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search bookings</span>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, phone or service" className="field min-h-[38px] py-1.5 text-sm" />
        </label>
        <button className="btn btn-ghost btn-sm">Search</button>
        {multi && (
          <FilterSelect
            param="loc"
            label="Location"
            value={loc}
            options={[{ value: "", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
          />
        )}
      </form>

      {rows.length === 0 ? (
        <Empty title={search ? "No matches." : tab === "upcoming" ? "No upcoming bookings." : "Nothing here yet."}>
          {!search && tab === "upcoming" && "New online bookings show up here and are texted to you."}
        </Empty>
      ) : (
        <>
          <div className="panel hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3 font-semibold">Received</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Appointment</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  {multi && <th className="px-4 py-3 font-semibold">Location</th>}
                  <th className="px-4 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-surface">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={r.href} className="font-semibold underline decoration-mist underline-offset-2 hover:decoration-ink">
                        {formatRelative(r.received, tz, now)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{r.status}</td>
                    <td className="min-w-[10rem] px-4 py-3">
                      <span className="block font-semibold">{r.name}</span>
                      <span className="whitespace-nowrap text-steel tabular-nums">{formatPhone(r.phone)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.when ?? <span className="text-mist">Quote</span>}
                      {r.flexible && <span className="block text-xs text-steel">Flexible</span>}
                    </td>
                    <td className="min-w-[12rem] px-4 py-3">
                      {r.what}
                      {r.extras > 0 && <span className="block text-xs text-steel">+{r.extras} extra{r.extras === 1 ? "" : "s"}</span>}
                    </td>
                    {multi && <td className="whitespace-nowrap px-4 py-3">{locName(r.locationId)}</td>}
                    <td className="whitespace-nowrap px-4 py-3 text-steel">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-2 md:hidden">
            {rows.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="panel block p-4 hover:border-ink">
                  <span className="flex flex-wrap items-center gap-2">
                    {r.status}
                    {r.flexible && <Flexible />}
                    <span className="ml-auto text-xs text-steel">{formatRelative(r.received, tz, now)}</span>
                  </span>
                  <span className="type-heading mt-2 block">{r.what}</span>
                  <span className="block text-sm">
                    {r.when ? `${r.when}. ` : ""}
                    {r.name}, {formatPhone(r.phone)}
                  </span>
                  {multi && r.locationId && <span className="block text-sm text-steel">{locName(r.locationId)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
