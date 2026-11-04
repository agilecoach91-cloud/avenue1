import type { Metadata } from "next";
import { deleteTimeOff } from "@/app/dashboard/actions";
import { PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailabilityRule, Business, TimeOff } from "@/lib/types";
import { HoursForm, TimeOffForm } from "./HoursForms";

export const metadata: Metadata = { title: "Hours" };

export default async function HoursPage() {
  const { supabase, business } = await requireOwner();
  const [{ data: rules }, { data: off }] = await Promise.all([
    supabase
      .from("availability")
      .select("weekday,start_minute,end_minute")
      .eq("business_id", business.id)
      .order("weekday")
      .returns<AvailabilityRule[]>(),
    supabase
      .from("time_off")
      .select("*")
      .eq("business_id", business.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .returns<TimeOff[]>(),
  ]);

  const settings: Pick<Business, "lead_time_hours" | "booking_window_days" | "slot_interval_min" | "auto_confirm"> = {
    lead_time_hours: business.lead_time_hours,
    booking_window_days: business.booking_window_days,
    slot_interval_min: business.slot_interval_min,
    auto_confirm: business.auto_confirm,
  };

  return (
    <>
      <PageTitle title="Hours and booking rules">Customers can only pick times inside these hours.</PageTitle>
      <HoursForm rules={rules ?? []} settings={settings} />

      <h2 className="type-heading mb-3 mt-10 text-lg">Days off</h2>
      <TimeOffForm />
      {(off ?? []).length > 0 && (
        <ul className="panel mt-4 divide-y divide-line">
          {(off ?? []).map((t) => {
            const last = new Date(new Date(t.ends_at).getTime() - 1);
            const from = formatInTimeZone(new Date(t.starts_at), business.timezone, "EEE d MMM");
            const to = formatInTimeZone(last, business.timezone, "EEE d MMM");
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="font-semibold">{from === to ? from : `${from} to ${to}`}</span>
                  {t.note && <span className="text-steel">, {t.note}</span>}
                </span>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn btn-ghost btn-sm">Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
