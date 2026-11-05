import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageTitle } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import type { AvailabilityRule } from "@/lib/types";
import { AddLocationForm } from "./CalendarForms";

export const metadata: Metadata = { title: "Calendar" };

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Mon–Fri, Sat" from the open weekdays. */
function openDaysText(days: number[]): string {
  const open = ORDER.filter((d) => days.includes(d));
  if (open.length === 0) return "Closed every day";
  const runs: number[][] = [];
  for (const d of open) {
    const last = runs[runs.length - 1];
    if (last && ORDER.indexOf(d) === ORDER.indexOf(last[last.length - 1]) + 1) last.push(d);
    else runs.push([d]);
  }
  return runs.map((r) => (r.length > 2 ? `${SHORT[r[0]]}–${SHORT[r[r.length - 1]]}` : r.map((d) => SHORT[d]).join(", "))).join(", ");
}

function noticeText(h: number) {
  if (h === 0) return "No booking notice";
  if (h % 24 === 0) return `${h / 24} day${h === 24 ? "" : "s"} booking notice`;
  return `${h} hour${h === 1 ? "" : "s"} booking notice`;
}

export default async function CalendarPage() {
  const { supabase, business } = await requireOwner();
  const locations = await ownerLocations(supabase, business.id);
  const { data: rules } = await supabase
    .from("availability")
    .select("location_id,weekday,start_minute,end_minute")
    .eq("business_id", business.id)
    .returns<AvailabilityRule[]>();

  return (
    <>
      <PageTitle title="Calendar">Hours, booking notice and daily limits for each location.</PageTitle>
      <ul className="grid gap-3">
        {locations.map((l) => {
          const days = [...new Set((rules ?? []).filter((r) => r.location_id === l.id).map((r) => r.weekday))];
          const limits = Object.values(l.daily_limits ?? {});
          return (
            <li key={l.id}>
              <Link href={`/dashboard/calendar/${l.id}`} className="panel flex items-center gap-4 p-4 hover:border-ink sm:p-5">
                <span className="tile-icon hidden h-11 w-11 shrink-0 sm:grid" style={{ background: "var(--color-surface)" }}>
                  <Icon name="pin" size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="type-heading block">{l.name}</span>
                  {l.address && <span className="block text-sm text-steel">{l.address}</span>}
                  <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" size={15} /> {noticeText(l.lead_time_hours)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="calendar" size={15} /> {openDaysText(days)}
                    </span>
                    {limits.length > 0 && <span>Up to {Math.max(...limits)} jobs a day</span>}
                  </span>
                </span>
                <Icon name="right" size={20} className="shrink-0 text-mist" />
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="type-heading mb-1 mt-10 text-lg">Add a location</h2>
      <p className="mb-4 text-steel">For another depot, shop or crew. Each location gets its own hours, calendar and Google booking link.</p>
      <AddLocationForm />
    </>
  );
}
