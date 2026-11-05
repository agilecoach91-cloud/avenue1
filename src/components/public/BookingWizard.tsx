"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, hasIcon } from "@/components/Icon";
import { formatDuration, formatPhone, formatPrice } from "@/lib/format";
import { formatAddonPrice, joinNames, totalPrice } from "@/lib/pricing";
import type { Addon, Location, Question, Service } from "@/lib/types";
import { shrinkPhoto } from "./photos";

export type WizardBusiness = {
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  licence_number: string | null;
  service_area: string | null;
  auto_confirm: boolean;
  /** Show "Powered by" (free plan). */
  badge: boolean;
  /** Whether the plan texts customers (otherwise email only). */
  texts: boolean;
};

type Slot = { start: string; end: string; label: string };
type StepId = "location" | "services" | "time" | "addons" | "details";
type Availability = { key: string; dates: string[]; date: string | null; slots: Slot[] };

const MAX_PHOTOS = 5;

// Dates arrive as local calendar strings (YYYY-MM-DD); format them as UTC noon
// so the weekday never shifts with the visitor's own time zone.
const weekdayFmt = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" });
const dayNumFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function asUtcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const TITLES: Record<StepId, string> = {
  location: "Choose a location",
  services: "Select a service",
  time: "Select date and time",
  addons: "Do you need anything else?",
  details: "Your details",
};

export function BookingWizard(props: {
  business: WizardBusiness;
  services: Service[];
  addons: Addon[];
  locations: Location[];
  initialServiceIds: string[];
  initialLocationId: string | null;
  source: string;
  embedded: boolean;
  closeHref: string;
}) {
  const { business, services, addons, locations } = props;
  const router = useRouter();

  const [locationId, setLocationId] = useState<string | null>(
    props.initialLocationId ?? (locations.length === 1 ? locations[0].id : null),
  );
  const [selected, setSelected] = useState<string[]>(props.initialServiceIds);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [flexible, setFlexible] = useState(false);
  const [reload, setReload] = useState(0);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const chosen = useMemo(() => services.filter((s) => selected.includes(s.id)), [services, selected]);
  const chosenAddons = useMemo(() => addons.filter((a) => addonIds.includes(a.id)), [addons, addonIds]);
  const isQuote = chosen.some((s) => s.booking_mode === "quote");
  const location = locations.find((l) => l.id === locationId) ?? null;

  const steps: StepId[] = [
    ...(locations.length > 1 ? (["location"] as const) : []),
    "services",
    ...(isQuote ? [] : (["time"] as const)),
    ...(addons.length ? (["addons"] as const) : []),
    "details",
  ];

  const [step, setStep] = useState<StepId>(() => {
    if (locations.length > 1 && !props.initialLocationId) return "location";
    const initial = services.filter((s) => props.initialServiceIds.includes(s.id));
    if (initial.length === 0) return "services";
    return initial.some((s) => s.booking_mode === "quote") ? "details" : "time";
  });
  const index = Math.max(0, steps.indexOf(step));

  // Move focus to the new step's heading so screen readers announce it.
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step, sent]);

  // Free days and times for the chosen location and services.
  const instantIds = chosen.filter((s) => s.booking_mode === "instant").map((s) => s.id).join(",");
  const availKey = `${locationId}|${instantIds}|${date ?? ""}|${reload}`;
  const current = avail?.key === availKey ? avail : null;
  useEffect(() => {
    if (step !== "time" || !locationId || !instantIds) return;
    let cancelled = false;
    const q = new URLSearchParams({ slug: business.slug, location: locationId, services: instantIds });
    if (date) q.set("date", date);
    fetch(`/api/public/slots?${q}`)
      .then((r) => r.json())
      .then((j: { dates?: string[]; date?: string | null; slots?: Slot[] }) => {
        if (!cancelled) setAvail({ key: availKey, dates: j.dates ?? [], date: j.date ?? null, slots: j.slots ?? [] });
      })
      .catch(() => {
        if (!cancelled) setAvail({ key: availKey, dates: [], date: null, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [step, availKey, business.slug, locationId, instantIds, date]);

  const shownDate = date ?? current?.date ?? null;
  const price = totalPrice(chosen, chosenAddons);
  const questions = useMemo(() => {
    const seen = new Set<string>();
    const out: Question[] = [];
    for (const s of chosen) {
      for (const q of s.questions ?? []) {
        if (seen.has(q.label)) continue;
        seen.add(q.label);
        out.push(q);
      }
    }
    return out;
  }, [chosen]);

  function go(next: StepId) {
    setError(null);
    setStep(next);
  }
  function nextStep(from: StepId) {
    const list = steps;
    const i = list.indexOf(from);
    go(list[Math.min(i + 1, list.length - 1)]);
  }
  function back() {
    if (index > 0) go(steps[index - 1]);
  }
  function close() {
    if (props.embedded && window.parent !== window) {
      window.parent.postMessage({ type: "bookd:close" }, "*");
      return;
    }
    router.push(props.closeHref);
  }

  function toggleService(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
    setSlot(null);
    setDate(null);
  }
  function toggleAddon(id: string) {
    setAddonIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).slice(0, MAX_PHOTOS - photos.length);
    const resized = await Promise.all(picked.map(shrinkPhoto));
    setPhotos((p) => [...p, ...resized].slice(0, MAX_PHOTOS));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const answers: Record<string, string> = {};
    for (const q of questions) {
      const v = String(form.get(`q-${q.id}`) ?? "").trim();
      if (v) answers[q.label] = v;
    }

    if (isQuote) {
      const body = new FormData();
      body.set("slug", business.slug);
      if (locationId) body.set("locationId", locationId);
      body.set("serviceIds", selected.join(","));
      body.set("addonIds", addonIds.join(","));
      body.set("answers", JSON.stringify(answers));
      for (const k of ["message", "name", "phone", "email", "address", "company"]) body.set(k, String(form.get(k) ?? ""));
      body.set("source", props.source);
      photos.forEach((p) => body.append("photos", p));
      const res = await fetch("/api/public/enquiries", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitting(false);
      if (!res.ok) {
        setError(json.error ?? "That didn't go through. Try again.");
        return;
      }
      setSent(true);
      return;
    }

    if (!slot) {
      setSubmitting(false);
      go("time");
      return;
    }
    const res = await fetch("/api/public/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: business.slug,
        locationId,
        serviceIds: chosen.map((s) => s.id),
        addonIds,
        start: slot.start,
        flexible,
        answers,
        source: props.source,
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        address: form.get("address"),
        notes: form.get("notes"),
        company: form.get("company"), // honeypot
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok || !json.token) {
      setSubmitting(false);
      setError(json.error ?? "That didn't go through. Check your details and try again.");
      if (res.status === 409) {
        // Someone else took that time: show fresh times for the same day.
        setSlot(null);
        setReload((n) => n + 1);
        setStep("time");
      }
      return;
    }
    router.push(`/b/${json.token}?new=1${props.embedded ? "&embed=1" : ""}`);
  }

  const title = sent ? "Request sent" : step === "details" && isQuote ? "Job details" : TITLES[step];
  const subtitle = sent
    ? undefined
    : step === "services"
      ? "Choose one or more."
      : step === "time"
        ? location && locations.length > 1
          ? location.name
          : undefined
        : step === "addons"
          ? "Add extras to the same visit."
          : step === "details"
            ? isQuote
              ? "Tell us about the job and add a few photos."
              : undefined
            : undefined;

  return (
    <div
      className={`grid overflow-hidden bg-paper md:grid-cols-[17rem_1fr] ${
        props.embedded ? "min-h-dvh" : "sm:rounded-[20px] sm:border sm:border-line sm:shadow-[0_24px_60px_-32px_rgba(20,33,43,0.45)]"
      }`}
    >
      <BrandPanel business={business} />

      <section className="flex min-h-[36rem] min-w-0 flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-6">
          {index > 0 && !sent ? (
            <button type="button" onClick={back} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line hover:border-ink" aria-label="Back">
              <Icon name="back" size={18} />
            </button>
          ) : (
            <span className="h-10 w-10 shrink-0" />
          )}
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-label="Booking progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={sent ? steps.length : index + 1}
          >
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
              style={{ width: `${sent ? 100 : ((index + 1) / (steps.length + 1)) * 100}%` }}
            />
          </div>
          <button type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface" aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-8">
          <h2 ref={heading} tabIndex={-1} className="type-heading text-center text-[1.35rem] outline-none sm:text-[1.5rem]">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-center text-sm text-steel">{subtitle}</p>}
          {error && (
            <p role="alert" className="mt-4 rounded-md bg-stop-soft p-3 text-sm text-stop">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-1 flex-col">
            {sent ? (
              <div className="grid gap-4 text-center" role="status">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-ink)]">
                  <Icon name="check" size={28} strokeWidth={2.25} />
                </span>
                <p>
                  {business.name} has your request{chosen.length ? ` for ${joinNames(chosen.map((s) => s.name))}` : ""}.
                  {business.texts ? "We'll text you back" : "We'll be in touch"}, usually within one business day.
                </p>
                <button type="button" onClick={close} className="btn btn-ghost mx-auto">
                  {props.embedded ? "Close" : `Back to ${business.name}`}
                </button>
              </div>
            ) : step === "location" ? (
              <ul className="grid gap-2">
                {locations.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-pressed={l.id === locationId}
                      onClick={() => {
                        setLocationId(l.id);
                        setSlot(null);
                        setDate(null);
                        go(selected.length ? (isQuote ? "details" : "time") : "services");
                      }}
                      className="choice"
                    >
                      <span className="flex items-start gap-3 text-left">
                        <span className="tile-icon h-10 w-10">
                          <Icon name="pin" size={20} />
                        </span>
                        <span>
                          <span className="block">{l.name}</span>
                          {l.address && <span className="block text-sm font-normal text-steel">{l.address}</span>}
                        </span>
                      </span>
                      <Icon name="right" size={18} className="shrink-0 text-steel" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : step === "services" ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                  {services.map((s) => {
                    const on = selected.includes(s.id);
                    return (
                      <button key={s.id} type="button" aria-pressed={on} onClick={() => toggleService(s.id)} className="tile">
                        <span className="tile-check">{on && <Icon name="check" size={14} strokeWidth={2.5} />}</span>
                        <span className="tile-icon">
                          <Icon name={hasIcon(s.icon) ? s.icon : s.booking_mode === "quote" ? "clipboard" : "wrench"} size={24} />
                        </span>
                        <span className="type-heading text-[0.98rem] leading-snug">{s.name}</span>
                        <span className="text-sm text-steel">
                          {formatPrice(s.price_type, s.price_cents)}
                          {s.booking_mode === "quote" ? ", send photos" : ` · ${formatDuration(s.duration_min)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {isQuote && chosen.length > 1 && (
                  <p className="mt-3 text-sm text-steel">Includes a quote job, so we&apos;ll confirm the price and time with you.</p>
                )}
                <Footer>
                  <Summary text={chosen.length ? `${chosen.length} selected · ${formatPrice(price.price_type, price.price_cents)}` : ""} />
                  <button type="button" className="btn btn-brand" disabled={chosen.length === 0} onClick={() => nextStep("services")}>
                    Next
                  </button>
                </Footer>
              </>
            ) : step === "time" ? (
              <TimeStep
                availability={current}
                shownDate={shownDate}
                slot={slot}
                flexible={flexible}
                autoConfirm={business.auto_confirm}
                phone={business.phone}
                onDate={(d) => {
                  setDate(d);
                  setSlot(null);
                }}
                onSlot={setSlot}
                onFlexible={setFlexible}
                onNext={() => nextStep("time")}
              />
            ) : step === "addons" ? (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {addons.map((a) => {
                    const on = addonIds.includes(a.id);
                    return (
                      <button key={a.id} type="button" aria-pressed={on} onClick={() => toggleAddon(a.id)} className="choice text-left">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="tile-icon h-10 w-10 shrink-0">
                            <Icon name={hasIcon(a.icon) ? a.icon : "plus"} size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="block leading-snug">{a.name}</span>
                            <span className="block text-sm font-normal text-steel">
                              {formatAddonPrice(a)}
                              {a.description ? ` · ${a.description}` : ""}
                            </span>
                          </span>
                        </span>
                        <span className="tile-check static shrink-0">{on && <Icon name="check" size={14} strokeWidth={2.5} />}</span>
                      </button>
                    );
                  })}
                </div>
                <Footer>
                  <button type="button" className="btn btn-ghost" onClick={() => { setAddonIds([]); nextStep("addons"); }}>
                    Skip
                  </button>
                  <button type="button" className="btn btn-brand" onClick={() => nextStep("addons")}>
                    {addonIds.length ? `Add ${addonIds.length} and continue` : "Next"}
                  </button>
                </Footer>
              </>
            ) : (
              <form onSubmit={submit} className="grid gap-4">
                <div className="rounded-lg bg-surface p-3.5 text-sm">
                  <p className="font-semibold">{joinNames(chosen.map((s) => s.name)) || "General enquiry"}</p>
                  {!isQuote && slot && shownDate && (
                    <p className="mt-0.5">
                      {longFmt.format(asUtcDate(shownDate))} at {slot.label}
                      {flexible ? ", flexible on time" : ""}
                    </p>
                  )}
                  {location && locations.length > 1 && <p className="mt-0.5 text-steel">{location.name}</p>}
                  {chosenAddons.length > 0 && (
                    <p className="mt-0.5 text-steel">Extras: {joinNames(chosenAddons.map((a) => a.name))}</p>
                  )}
                  <p className="mt-1 font-semibold">{formatPrice(price.price_type, price.price_cents)}</p>
                </div>

                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="label" htmlFor={`q-${q.id}`}>
                      {q.label}
                      {!q.required && <span className="font-normal text-steel"> (optional)</span>}
                    </label>
                    {q.type === "select" && q.options?.length ? (
                      <select id={`q-${q.id}`} name={`q-${q.id}`} required={q.required} className="field" defaultValue="">
                        <option value="" disabled>
                          Choose one
                        </option>
                        {q.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input id={`q-${q.id}`} name={`q-${q.id}`} required={q.required} inputMode={q.type === "number" ? "numeric" : undefined} className="field" />
                    )}
                  </div>
                ))}

                {isQuote && (
                  <>
                    <div>
                      <label className="label" htmlFor="message">Describe the job</label>
                      <textarea id="message" name="message" required className="field" placeholder="What's the problem, how big is the area, any access issues?" />
                    </div>
                    <div>
                      <span className="label">
                        Photos <span className="font-normal text-steel">(up to {MAX_PHOTOS})</span>
                      </span>
                      {photos.length > 0 && (
                        <ul className="mb-2 grid grid-cols-5 gap-2">
                          {photos.map((p, i) => (
                            <li key={i} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(p)} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md border border-line object-cover" />
                              <button
                                type="button"
                                onClick={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-paper"
                                aria-label={`Remove photo ${i + 1}`}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {photos.length < MAX_PHOTOS && (
                        <label className="btn btn-ghost w-full cursor-pointer">
                          <Icon name="camera" size={20} /> Add photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            onChange={(e) => {
                              void addPhotos(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="label" htmlFor="name">Your name</label>
                  <input id="name" name="name" required autoComplete="name" className="field" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="phone">Mobile</label>
                    <input id="phone" name="phone" required type="tel" autoComplete="tel" inputMode="tel" className="field" />
                    <p className="hint mt-1">
                      {business.texts
                        ? isQuote
                          ? "We'll text you the price."
                          : "We text your confirmation and a reminder."
                        : "So we can reach you about the job."}
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="email">
                      Email <span className="font-normal text-steel">(optional)</span>
                    </label>
                    <input id="email" name="email" type="email" autoComplete="email" className="field" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="address">
                    {isQuote ? "Suburb or address" : "Job address"}
                    {isQuote && <span className="font-normal text-steel"> (optional)</span>}
                  </label>
                  <input id="address" name="address" required={!isQuote} autoComplete="street-address" className="field" />
                </div>
                {!isQuote && (
                  <div>
                    <label className="label" htmlFor="notes">
                      Anything we should know? <span className="font-normal text-steel">(optional)</span>
                    </label>
                    <textarea id="notes" name="notes" className="field" placeholder="Pets, gate codes, parking" />
                  </div>
                )}
                <div aria-hidden className="absolute -left-[9999px]">
                  <label>
                    Company
                    <input name="company" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <button className="btn btn-brand" disabled={submitting}>
                  {submitting
                    ? "Sending…"
                    : isQuote
                      ? "Send quote request"
                      : business.auto_confirm
                        ? "Confirm booking"
                        : "Send booking request"}
                </button>
                {!isQuote && !business.auto_confirm && (
                  <p className="hint -mt-2 text-center">
                    {business.texts ? "The business confirms your time by text." : "The business will confirm your time."}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {business.badge && (
          <p className="pb-4 text-center text-xs text-mist">
            Powered by{" "}
            <Link href="/" className="font-semibold hover:underline">
              Bookd
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto flex items-center justify-end gap-3 pt-6">{children}</div>;
}

function Summary({ text }: { text: string }) {
  return <p className="mr-auto text-sm font-semibold text-steel">{text}</p>;
}

function TimeStep(props: {
  availability: Availability | null;
  shownDate: string | null;
  slot: Slot | null;
  flexible: boolean;
  autoConfirm: boolean;
  phone: string | null;
  onDate: (d: string) => void;
  onSlot: (s: Slot) => void;
  onFlexible: (v: boolean) => void;
  onNext: () => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const a = props.availability;
  if (!a) return <p className="text-center text-steel">Finding free times…</p>;
  if (a.dates.length === 0) {
    return (
      <div className="grid gap-3 text-center">
        <p>No online times are free in the next few weeks.</p>
        {props.phone && <p className="font-semibold">Call {formatPhone(props.phone)} and we&apos;ll fit you in.</p>}
      </div>
    );
  }
  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--brand)] px-3 py-1 text-sm font-bold text-[var(--brand-ink)]">
          {monthFmt.format(asUtcDate(props.shownDate ?? a.dates[0]))}
        </span>
        <span className="flex gap-1">
          <button type="button" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface" aria-label="Earlier days">
            <Icon name="left" size={18} />
          </button>
          <button type="button" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface" aria-label="Later days">
            <Icon name="right" size={18} />
          </button>
        </span>
      </div>
      <div ref={strip} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Days">
        {a.dates.map((d) => {
          const on = d === props.shownDate;
          const dt = asUtcDate(d);
          return (
            <button
              key={d}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => props.onDate(d)}
              className={`day-pill ${on ? "day-pill-on" : ""}`}
            >
              <span className="text-xs">{weekdayFmt.format(dt)}</span>
              <span className="type-heading text-lg leading-none">{dayNumFmt.format(dt)}</span>
            </button>
          );
        })}
      </div>

      {props.shownDate && <p className="type-heading mb-2 mt-3 text-sm text-steel">{longFmt.format(asUtcDate(props.shownDate))}</p>}
      {a.slots.length === 0 ? (
        <p className="text-steel">That day just filled up. Try another day.</p>
      ) : (
        <div className="grid max-h-[17rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {a.slots.map((s) => (
            <button key={s.start} type="button" aria-pressed={props.slot?.start === s.start} onClick={() => props.onSlot(s)} className="choice choice-solid justify-center">
              {s.label}
            </button>
          ))}
        </div>
      )}

      <label className="mt-5 flex items-center gap-3">
        <input type="checkbox" role="switch" className="switch" checked={props.flexible} onChange={(e) => props.onFlexible(e.target.checked)} />
        <span>
          <span className="font-semibold">I&apos;m flexible</span>
          <span className="hint block">Happy for us to move the time if it helps.</span>
        </span>
      </label>

      <Footer>
        <button type="button" className="btn btn-brand" disabled={!props.slot} onClick={props.onNext}>
          {props.autoConfirm ? "Book this time" : "Request this time"}
        </button>
      </Footer>
    </div>
  );
}

function BrandPanel({ business }: { business: WizardBusiness }) {
  const rating = business.google_rating != null ? Number(business.google_rating) : null;
  return (
    <aside className="relative hidden flex-col overflow-hidden bg-[var(--brand)] p-6 text-[var(--brand-ink)] md:flex">
      {business.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={business.logo_url} alt="" className="mb-5 h-12 w-12 rounded-md bg-paper object-contain p-1" />
      )}
      <p className="type-display text-[1.75rem] leading-[1.05]">{business.tagline || `Book ${business.name} online`}</p>
      {business.about && <p className="mt-3 line-clamp-4 text-sm opacity-90">{business.about}</p>}
      {rating != null && (
        <p className="mt-4 text-sm">
          <span className="font-bold">Google</span>{" "}
          <span aria-hidden className="tracking-[0.15em]">{"★★★★★".slice(0, Math.round(rating))}</span>
          <span className="block opacity-90">
            {rating.toFixed(1)} from {business.google_review_count ?? 0} reviews
          </span>
        </p>
      )}
      <ul className="mt-4 grid gap-1.5 text-sm">
        {business.licence_number && <li className="flex items-center gap-2"><Icon name="shield" size={16} /> {business.licence_number}</li>}
        {business.service_area && <li className="flex items-center gap-2"><Icon name="pin" size={16} /> {business.service_area}</li>}
      </ul>
      {business.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={business.cover_url} alt="" className="-mx-6 -mb-6 mt-auto h-56 w-[calc(100%+3rem)] max-w-none object-cover pt-6" />
      )}
    </aside>
  );
}
