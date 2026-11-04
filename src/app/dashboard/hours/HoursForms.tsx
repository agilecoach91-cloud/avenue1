"use client";

import { useActionState } from "react";
import { addTimeOff, saveHours, type FormState } from "@/app/dashboard/actions";
import { Saved } from "@/components/dashboard/ui";
import type { AvailabilityRule, Business } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function HoursForm({
  rules,
  settings,
}: {
  rules: AvailabilityRule[];
  settings: Pick<Business, "lead_time_hours" | "booking_window_days" | "slot_interval_min" | "auto_confirm">;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHours, {});
  return (
    <form action={action} className="grid gap-6">
      <Saved show={Boolean(state.ok)}>Hours saved</Saved>
      {state.error && (
        <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">{state.error}</p>
      )}
      <fieldset className="panel divide-y divide-line">
        <legend className="sr-only">Working hours</legend>
        {DAYS.map((day, i) => {
          const d = WEEKDAY_INDEX[i];
          const rule = rules.find((r) => r.weekday === d);
          return (
            <div key={d} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 p-3 sm:grid-cols-[9rem_1fr]">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" name={`open_${d}`} defaultChecked={Boolean(rule)} className="h-5 w-5" />
                {day}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name={`start_${d}`}
                  aria-label={`${day} start`}
                  defaultValue={hhmm(rule?.start_minute ?? 450)}
                  step={900}
                  className="field max-w-[9rem]"
                />
                <span className="text-steel">to</span>
                <input
                  type="time"
                  name={`end_${d}`}
                  aria-label={`${day} finish`}
                  defaultValue={hhmm(rule?.end_minute ?? 990)}
                  step={900}
                  className="field max-w-[9rem]"
                />
              </div>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-3">
        <legend className="sr-only">Booking rules</legend>
        <div>
          <label className="label" htmlFor="lead_time_hours">Notice needed</label>
          <select id="lead_time_hours" name="lead_time_hours" defaultValue={settings.lead_time_hours} className="field">
            {[0, 2, 4, 12, 24, 48, 72].map((h) => (
              <option key={h} value={h}>{h === 0 ? "None" : h < 24 ? `${h} hours` : `${h / 24} day${h === 24 ? "" : "s"}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="booking_window_days">Book up to</label>
          <select id="booking_window_days" name="booking_window_days" defaultValue={settings.booking_window_days} className="field">
            {[7, 14, 28, 42, 60, 90].map((d) => (
              <option key={d} value={d}>{d % 7 === 0 ? `${d / 7} weeks ahead` : `${d} days ahead`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="slot_interval_min">Start times every</label>
          <select id="slot_interval_min" name="slot_interval_min" defaultValue={settings.slot_interval_min} className="field">
            {[15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr`}</option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-3 sm:col-span-3">
          <input type="checkbox" name="auto_confirm" defaultChecked={settings.auto_confirm} className="mt-1 h-5 w-5" />
          <span>
            <span className="font-semibold">Confirm bookings automatically</span>
            <span className="hint block">Turn off to approve each booking yourself before the customer is confirmed.</span>
          </span>
        </label>
      </fieldset>

      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save hours"}
      </button>
    </form>
  );
}

export function TimeOffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addTimeOff, {});
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      {state.error && (
        <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop sm:col-span-4">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="from">From</label>
        <input id="from" name="from" type="date" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="to">To</label>
        <input id="to" name="to" type="date" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="note">Note <span className="font-normal text-steel">(optional)</span></label>
        <input id="note" name="note" className="field" placeholder="Holidays" />
      </div>
      <button className="btn btn-dark" disabled={pending}>Block out</button>
    </form>
  );
}
