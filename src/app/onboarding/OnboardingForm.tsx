"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { TIMEZONES } from "@/lib/format";
import type { PlaceResult } from "@/lib/google-places";
import { slugify } from "@/lib/slug";
import { TRADE_TEMPLATES } from "@/lib/templates";
import { checkSlug, createBusiness, findOnGoogle, type OnboardingState } from "./actions";

export function OnboardingForm({
  email,
  googleEnabled,
  appHost,
}: {
  email: string;
  googleEnabled: boolean;
  appHost: string;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createBusiness, {});
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [query, setQuery] = useState("");
  const [searching, startSearch] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slug = customSlug ?? slugify(name);
  const [checked, setChecked] = useState<{ slug: string; available: boolean } | null>(null);
  const slugStatus = slug.length < 3 || checked?.slug !== slug ? "idle" : checked.available ? "ok" : "taken";

  useEffect(() => {
    if (slug.length < 3) return;
    const t = setTimeout(async () => {
      const r = await checkSlug(slug);
      setChecked({ slug, available: r.available });
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  function choose(p: PlaceResult) {
    setPlace(p);
    setName(p.name);
    if (p.phone) setPhone(p.phone);
    setResults(null);
  }

  return (
    <div className="grid gap-6">
      {googleEnabled && (
        <section className="panel p-5">
          <h2 className="type-heading">Start from your Google listing</h2>
          <p className="hint mb-3 mt-1">We&apos;ll copy your name, phone and star rating.</p>
          {place ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-go-soft p-3">
              <div>
                <p className="font-semibold">{place.name}</p>
                <p className="text-sm text-steel">
                  {place.address}
                  {place.rating ? `, ★ ${place.rating} (${place.reviewCount})` : ""}
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlace(null)}>
                Change
              </button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                startSearch(async () => setResults(await findOnGoogle(query)));
              }}
            >
              <input
                className="field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Business name and suburb"
                aria-label="Search Google for your business"
              />
              <button className="btn btn-dark shrink-0" disabled={searching || query.length < 3}>
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
          )}
          {results && (
            <ul className="mt-3 divide-y divide-line rounded-md border border-line">
              {results.length === 0 && <li className="p-3 text-steel">No matches. Fill in the form below instead.</li>}
              {results.map((r) => (
                <li key={r.placeId}>
                  <button type="button" onClick={() => choose(r)} className="w-full p-3 text-left hover:bg-surface">
                    <span className="font-semibold">{r.name}</span>
                    <span className="block text-sm text-steel">{r.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form action={action} className="panel grid gap-4 p-5">
        {state.error && (
          <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">
            {state.error}
          </p>
        )}
        {place && (
          <>
            <input type="hidden" name="google_place_id" value={place.placeId} />
            <input type="hidden" name="google_review_url" value={place.reviewUrl} />
            {place.rating != null && <input type="hidden" name="google_rating" value={place.rating} />}
            {place.reviewCount != null && <input type="hidden" name="google_review_count" value={place.reviewCount} />}
            {place.address && <input type="hidden" name="address" value={place.address} />}
            {place.website && <input type="hidden" name="website_url" value={place.website} />}
          </>
        )}
        <div>
          <label className="label" htmlFor="name">Business name</label>
          <input id="name" name="name" required className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="trade">What do you do?</label>
          <select id="trade" name="trade" className="field" defaultValue="pest_control">
            {TRADE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <p className="hint mt-1">We&apos;ll add a starter price list you can edit.</p>
        </div>
        <div>
          <label className="label" htmlFor="slug">Your page address</label>
          <div className="flex items-center rounded-[10px] border-[1.5px] border-line bg-paper focus-within:border-ink">
            <span className="pl-3 text-steel">{appHost}/</span>
            <input
              id="slug"
              name="slug"
              required
              className="min-h-[48px] w-full bg-transparent py-2 pr-3 outline-none"
              value={slug}
              onChange={(e) => setCustomSlug(slugify(e.target.value))}
            />
          </div>
          {slugStatus === "taken" && <p className="mt-1 text-sm text-stop">That address is taken. Try another.</p>}
          {slugStatus === "ok" && <p className="mt-1 text-sm text-go">Available</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Your mobile</label>
            <input id="phone" name="phone" type="tel" required className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="hint mt-1">Shown to customers. New bookings are texted here.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Email for bookings</label>
            <input id="email" name="email" type="email" required className="field" defaultValue={email} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="service_area">Areas you service <span className="font-normal text-steel">(optional)</span></label>
          <input id="service_area" name="service_area" className="field" placeholder="Northern Beaches and North Shore" />
        </div>
        <div>
          <label className="label" htmlFor="timezone">State</label>
          <select id="timezone" name="timezone" className="field" defaultValue="Australia/Sydney">
            {TIMEZONES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={pending || slugStatus === "taken"}>
          {pending ? "Creating your page…" : "Create my booking page"}
        </button>
      </form>
    </div>
  );
}
