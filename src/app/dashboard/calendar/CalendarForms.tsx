"use client";

import { useActionState } from "react";
import {
  addBlockedDates,
  addLocation,
  deleteLocation,
  saveLocationDetails,
  saveLocationHours,
  saveLocationLimits,
  type FormState,
} from "@/app/dashboard/actions";
import { Saved } from "@/components/dashboard/ui";
import type { AvailabilityRule } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function ErrorNote({ state }: { state: FormState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">
      {state.error}
    </p>
  );
}

export function AddLocationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addLocation, {});
  return (
    <form action={action} className="panel grid gap-4 p-5">
      <ErrorNote state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new-name">Location name</label>
          <input id="new-name" name="name" required className="field" placeholder="North Shore" />
        </div>
        <div>
          <label className="label" htmlFor="new-phone">
            Phone <span className="font-normal text-steel">(optional)</span>
          </label>
          <input id="new-phone" name="phone" type="tel" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="new-address">
          Address <span className="font-normal text-steel">(optional)</span>
        </label>
        <input id="new-address" name="address" className="field" placeholder="12 Victoria Ave, Chatswood NSW 2067" />
        <p className="hint mt-1">Starts with the same hours as your first location. You can change them after.</p>
      </div>
      <button className="btn btn-dark justify-self-start" disabled={pending}>
        {pending ? "Adding…" : "Add location"}
      </button>
    </form>
  );
}

export function LocationHoursForm({ locationId, rules }: { locationId: string; rules: AvailabilityRule[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLocationHours, {});
  return (
    <form action={action} className="grid gap-5">
      <Saved show={Boolean(state.ok)}>Hours saved</Saved>
      <ErrorNote state={state} />
      <input type="hidden" name="location" value={locationId} />
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
                <input type="time" name={`start_${d}`} aria-label={`${day} start`} defaultValue={hhmm(rule?.start_minute ?? 450)} step={900} className="field max-w-[9rem]" />
                <span className="text-steel">to</span>
                <input type="time" name={`end_${d}`} aria-label={`${day} finish`} defaultValue={hhmm(rule?.end_minute ?? 990)} step={900} className="field max-w-[9rem]" />
              </div>
            </div>
          );
        })}
      </fieldset>
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save hours"}
      </button>
    </form>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
function noticeLabel(h: number): string {
  if (h === 0) return "No notice";
  return h % 24 === 0 ? plural(h / 24, "day") : plural(h, "hour");
}

export function LimitsForm({
  locationId,
  leadTimeHours,
  limits,
  openDays,
}: {
  locationId: string;
  leadTimeHours: number;
  limits: Record<string, number>;
  openDays: number[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLocationLimits, {});
  const presets = [0, 2, 4, 12, 24, 48, 72];
  const options = presets.includes(leadTimeHours) ? presets : [...presets, leadTimeHours].sort((a, b) => a - b);
  return (
    <form action={action} className="grid gap-5">
      <Saved show={Boolean(state.ok)}>Booking limits saved</Saved>
      <ErrorNote state={state} />
      <input type="hidden" name="location" value={locationId} />
      <section className="panel p-5">
        <h2 className="type-heading">Booking notice</h2>
        <p className="hint mb-3 mt-1">How much notice you need before a job.</p>
        <select name="lead_time_hours" defaultValue={leadTimeHours} className="field max-w-[14rem]" aria-label="Booking notice">
          {options.map((h) => (
            <option key={h} value={h}>
              {noticeLabel(h)}
            </option>
          ))}
        </select>
      </section>
      <section className="panel p-5">
        <h2 className="type-heading">Daily booking limits</h2>
        <p className="hint mb-4 mt-1">Most jobs that can be booked online each day. Leave blank for no limit.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((day, i) => {
            const d = WEEKDAY_INDEX[i];
            const open = openDays.includes(d);
            return (
              <div key={d}>
                <label className="label" htmlFor={`limit_${d}`}>{day}</label>
                <input
                  id={`limit_${d}`}
                  name={`limit_${d}`}
                  type="number"
                  min={0}
                  max={50}
                  inputMode="numeric"
                  defaultValue={limits[String(d)] ?? ""}
                  placeholder={open ? "No limit" : "Closed"}
                  disabled={!open}
                  className="field"
                />
                {!open && <p className="hint mt-1">Closed this day.</p>}
              </div>
            );
          })}
        </div>
      </section>
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save booking limits"}
      </button>
    </form>
  );
}

export function BlockedDatesForm({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addBlockedDates, {});
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      {state.error && <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop sm:col-span-4">{state.error}</p>}
      <input type="hidden" name="location" value={locationId} />
      <div>
        <label className="label" htmlFor="from">From</label>
        <input id="from" name="from" type="date" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="to">To</label>
        <input id="to" name="to" type="date" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="note">
          Note <span className="font-normal text-steel">(optional)</span>
        </label>
        <input id="note" name="note" className="field" placeholder="Holidays" />
      </div>
      <button className="btn btn-dark" disabled={pending}>
        Block out
      </button>
    </form>
  );
}

export function LocationDetailsForm({
  location,
}: {
  location: { id: string; name: string; address: string | null; phone: string | null };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLocationDetails, {});
  return (
    <form action={action} className="panel grid gap-4 p-5">
      <Saved show={Boolean(state.ok)}>Location saved</Saved>
      <ErrorNote state={state} />
      <input type="hidden" name="location" value={location.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="loc-name">Location name</label>
          <input id="loc-name" name="name" required defaultValue={location.name} className="field" />
          <p className="hint mt-1">Customers see this when they choose where to book.</p>
        </div>
        <div>
          <label className="label" htmlFor="loc-phone">
            Phone <span className="font-normal text-steel">(optional)</span>
          </label>
          <input id="loc-phone" name="phone" type="tel" defaultValue={location.phone ?? ""} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="loc-address">
          Address <span className="font-normal text-steel">(optional)</span>
        </label>
        <input id="loc-address" name="address" defaultValue={location.address ?? ""} className="field" />
      </div>
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save location"}
      </button>
    </form>
  );
}

export function DeleteLocationForm({ locationId, name }: { locationId: string; name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteLocation, {});
  return (
    <form action={action} className="grid gap-2">
      <ErrorNote state={state} />
      <input type="hidden" name="location" value={locationId} />
      <button className="btn btn-danger btn-sm justify-self-start" disabled={pending}>
        Delete {name}
      </button>
      <p className="hint">Past bookings keep their details. Upcoming bookings must be moved or cancelled first.</p>
    </form>
  );
}
