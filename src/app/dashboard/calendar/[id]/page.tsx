import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { deleteBlockedDate } from "@/app/dashboard/actions";
import { Icon } from "@/components/Icon";
import { PageTitle, Saved, Tabs } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import type { AvailabilityRule, Location, TimeOff } from "@/lib/types";
import { BlockedDatesForm, DeleteLocationForm, LimitsForm, LocationDetailsForm, LocationHoursForm } from "../CalendarForms";

export const metadata: Metadata = { title: "Location calendar" };

const TABS = [
  { id: "hours", label: "Hours" },
  { id: "limits", label: "Booking limits" },
  { id: "blocked", label: "Blocked dates" },
  { id: "details", label: "Details" },
] as const;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; saved?: string }> };

export default async function LocationCalendarPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "hours";
  const { supabase, business } = await requireOwner();
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Location>();
  if (!location) notFound();

  const [{ data: rules }, { data: blocked }, all] = await Promise.all([
    supabase
      .from("availability")
      .select("weekday,start_minute,end_minute")
      .eq("location_id", location.id)
      .order("weekday")
      .returns<AvailabilityRule[]>(),
    supabase
      .from("time_off")
      .select("*")
      .eq("location_id", location.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .returns<TimeOff[]>(),
    ownerLocations(supabase, business.id),
  ]);

  return (
    <>
      <Link href="/dashboard/calendar" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-steel hover:text-ink">
        <Icon name="left" size={16} /> Calendar
      </Link>
      <PageTitle title={location.name}>{location.address}</PageTitle>
      <Saved show={sp.saved === "added"}>Location added. Check its hours, then share its booking link.</Saved>
      <Tabs
        label="Location settings"
        current={tab}
        items={TABS.map((t) => ({ id: t.id, label: t.label, href: `/dashboard/calendar/${location.id}${t.id === "hours" ? "" : `?tab=${t.id}`}` }))}
      />

      {tab === "hours" && <LocationHoursForm locationId={location.id} rules={rules ?? []} />}

      {tab === "limits" && (
        <LimitsForm
          locationId={location.id}
          leadTimeHours={location.lead_time_hours}
          limits={location.daily_limits ?? {}}
          openDays={[...new Set((rules ?? []).map((r) => r.weekday))]}
        />
      )}

      {tab === "blocked" && (
        <>
          <BlockedDatesForm locationId={location.id} />
          {(blocked ?? []).length > 0 ? (
            <ul className="panel mt-4 divide-y divide-line">
              {(blocked ?? []).map((t) => {
                const last = new Date(new Date(t.ends_at).getTime() - 1);
                const from = formatInTimeZone(new Date(t.starts_at), business.timezone, "EEE d MMM");
                const to = formatInTimeZone(last, business.timezone, "EEE d MMM");
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <span>
                      <span className="font-semibold">{from === to ? from : `${from} to ${to}`}</span>
                      {t.note && <span className="text-steel">, {t.note}</span>}
                    </span>
                    <form action={deleteBlockedDate}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn btn-ghost btn-sm">Remove</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-steel">No blocked dates coming up.</p>
          )}
        </>
      )}

      {tab === "details" && (
        <div className="grid gap-8">
          <LocationDetailsForm location={location} />
          {all.length > 1 && <DeleteLocationForm locationId={location.id} name={location.name} />}
        </div>
      )}
    </>
  );
}
