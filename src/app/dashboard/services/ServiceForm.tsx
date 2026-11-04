"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveService, type FormState } from "@/app/dashboard/actions";
import type { Service } from "@/lib/types";

function questionsToText(s?: Service | null): string {
  return (s?.questions ?? [])
    .map((q) => (q.options?.length ? `${q.label}: ${q.options.join(", ")}` : q.label))
    .join("\n");
}

export function ServiceForm({ service }: { service?: Service | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveService, {});
  const [priceType, setPriceType] = useState(service?.price_type ?? "fixed");

  return (
    <form action={action} className="panel grid gap-4 p-5">
      {state.error && (
        <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">
          {state.error}
        </p>
      )}
      {service && <input type="hidden" name="id" value={service.id} />}
      <div>
        <label className="label" htmlFor="name">Service name</label>
        <input id="name" name="name" required defaultValue={service?.name} className="field" placeholder="General pest treatment" />
      </div>
      <div>
        <label className="label" htmlFor="description">Short description <span className="font-normal text-steel">(optional)</span></label>
        <input id="description" name="description" defaultValue={service?.description ?? ""} className="field" placeholder="What's included" />
      </div>
      <fieldset>
        <legend className="label">Price</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { id: "fixed", label: "Fixed price" },
            { id: "from", label: "From a price" },
            { id: "quote", label: "Quote only" },
          ].map((o) => (
            <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-md border-[1.5px] p-3 ${priceType === o.id ? "border-ink" : "border-line"}`}>
              <input
                type="radio"
                name="price_type"
                value={o.id}
                checked={priceType === o.id}
                onChange={() => setPriceType(o.id as Service["price_type"])}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {priceType !== "quote" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">Price in dollars (incl. GST)</label>
            <input
              id="price"
              name="price"
              inputMode="decimal"
              required
              defaultValue={service?.price_cents != null ? (service.price_cents / 100).toString() : ""}
              className="field"
              placeholder="199"
            />
          </div>
          <div>
            <label className="label" htmlFor="booking_mode">How customers book</label>
            <select id="booking_mode" name="booking_mode" defaultValue={service?.booking_mode ?? "instant"} className="field">
              <option value="instant">Pick a time online</option>
              <option value="quote">Send a quote request</option>
            </select>
          </div>
        </div>
      )}
      {priceType === "quote" && <input type="hidden" name="booking_mode" value="quote" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="duration_min">Time to block out</label>
          <select id="duration_min" name="duration_min" defaultValue={service?.duration_min ?? 60} className="field">
            {[30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} hr`}
              </option>
            ))}
          </select>
          <p className="hint mt-1">Include travel time if you need it.</p>
        </div>
        <div>
          <label className="label" htmlFor="repeat_months">Repeat-service reminder</label>
          <select id="repeat_months" name="repeat_months" defaultValue={service?.repeat_months ?? ""} className="field">
            <option value="">None</option>
            <option value="1">Monthly</option>
            <option value="3">Every 3 months</option>
            <option value="6">Every 6 months</option>
            <option value="12">Yearly</option>
          </select>
          <p className="hint mt-1">Coming soon: we&apos;ll text customers when it&apos;s due.</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="questions">Questions to ask <span className="font-normal text-steel">(optional)</span></label>
        <textarea
          id="questions"
          name="questions"
          defaultValue={questionsToText(service)}
          className="field font-normal"
          placeholder={"Property type: House, Unit, Commercial\nHow many storeys?: 1, 2, 3+\nAny pets?"}
        />
        <p className="hint mt-1">
          One per line. Add options after a colon, separated by commas, to show a dropdown.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </button>
        <Link href="/dashboard/services" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
