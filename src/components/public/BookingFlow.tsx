"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import type { Question } from "@/lib/types";

type Slot = { start: string; end: string; label: string };
type Step = "details" | "time" | "contact";

// Dates arrive as local calendar strings (YYYY-MM-DD); format them as UTC noon
// so the weekday never shifts with the visitor's own time zone.
const dayFmt = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function asUtcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function BookingFlow(props: {
  slug: string;
  serviceId: string;
  questions: Question[];
  dates: string[];
  timezone: string;
  source: string;
  autoConfirm: boolean;
  businessPhone: string | null;
}) {
  const router = useRouter();
  const hasQuestions = props.questions.length > 0;
  const [step, setStep] = useState<Step>(hasQuestions ? "details" : "time");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [date, setDate] = useState<string | null>(props.dates[0] ?? null);
  const [loaded, setLoaded] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reload, setReload] = useState(0);
  const slotsKey = `${date}:${reload}`;
  const slots = loaded?.key === slotsKey ? loaded.slots : null;

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    const key = `${date}:${reload}`;
    fetch(`/api/public/slots?slug=${props.slug}&service=${props.serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((j: { slots?: Slot[] }) => {
        if (!cancelled) setLoaded({ key, slots: j.slots ?? [] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, slots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [date, reload, props.slug, props.serviceId]);

  function submitDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    for (const q of props.questions) {
      const v = String(form.get(q.id) ?? "").trim();
      if (v) next[q.label] = v;
    }
    setAnswers(next);
    setStep("time");
  }

  async function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/public/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: props.slug,
        serviceId: props.serviceId,
        start: slot.start,
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
        setStep("time");
        setSlot(null);
        setReload((n) => n + 1);
      }
      return;
    }
    router.push(`/b/${json.token}?new=1`);
  }

  if (props.dates.length === 0) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">No online times are free in the next few weeks.</p>
        {props.businessPhone && (
          <a className="btn btn-brand mt-4" href={`tel:${props.businessPhone}`}>
            Call {formatPhone(props.businessPhone)}
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <Progress step={step} hasQuestions={hasQuestions} />

      {step === "details" && (
        <form onSubmit={submitDetails} className="panel grid gap-4 p-5">
          {props.questions.map((q) => (
            <div key={q.id}>
              <label className="label" htmlFor={`q-${q.id}`}>
                {q.label}
                {!q.required && <span className="font-normal text-steel"> (optional)</span>}
              </label>
              {q.type === "select" && q.options?.length ? (
                <select id={`q-${q.id}`} name={q.id} required={q.required} className="field" defaultValue="">
                  <option value="" disabled>
                    Choose one
                  </option>
                  {q.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`q-${q.id}`}
                  name={q.id}
                  required={q.required}
                  inputMode={q.type === "number" ? "numeric" : undefined}
                  className="field"
                />
              )}
            </div>
          ))}
          <button className="btn btn-brand">Choose a time</button>
        </form>
      )}

      {step === "time" && (
        <div className="panel p-5">
          {error && <p role="alert" className="mb-4 rounded-md bg-stop-soft p-3 text-sm text-stop">{error}</p>}
          <h2 className="type-heading mb-3">Pick a day</h2>
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Days">
            {props.dates.map((d) => {
              const selected = d === date;
              const dt = asUtcDate(d);
              return (
                <button
                  key={d}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setDate(d);
                    setSlot(null);
                  }}
                  className={`flex min-w-[4.5rem] snap-start flex-col items-center rounded-md border-[1.5px] px-2 py-2 ${
                    selected ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
                  }`}
                >
                  <span className="text-xs">{dayFmt.format(dt)}</span>
                  <span className="type-heading text-sm">{dateFmt.format(dt)}</span>
                </button>
              );
            })}
          </div>

          {date && <h2 className="type-heading mb-3 mt-5">{longFmt.format(asUtcDate(date))}</h2>}
          {slots === null ? (
            <p className="text-steel">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="text-steel">That day just filled up. Try another day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => {
                    setSlot(s);
                    setError(null);
                    setStep("contact");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {hasQuestions && (
            <button type="button" onClick={() => setStep("details")} className="mt-5 text-sm font-semibold text-steel underline">
              Change job details
            </button>
          )}
        </div>
      )}

      {step === "contact" && slot && date && (
        <form onSubmit={submitContact} className="panel grid gap-4 p-5">
          <div className="rounded-md bg-surface p-3">
            <p className="type-heading">
              {longFmt.format(asUtcDate(date))}, {slot.label}
            </p>
            <button type="button" onClick={() => setStep("time")} className="text-sm font-semibold text-steel underline">
              Change time
            </button>
          </div>
          {error && <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">{error}</p>}
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" name="name" required autoComplete="name" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile</label>
            <input id="phone" name="phone" required type="tel" autoComplete="tel" inputMode="tel" className="field" />
            <p className="hint mt-1">We text your confirmation and a reminder the day before.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Email <span className="font-normal text-steel">(optional)</span></label>
            <input id="email" name="email" type="email" autoComplete="email" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="address">Job address</label>
            <input id="address" name="address" required autoComplete="street-address" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="notes">Anything we should know? <span className="font-normal text-steel">(optional)</span></label>
            <textarea id="notes" name="notes" className="field" placeholder="Pets, gate codes, parking" />
          </div>
          <div aria-hidden className="absolute -left-[9999px]">
            <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <button className="btn btn-brand" disabled={submitting}>
            {submitting ? "Booking…" : props.autoConfirm ? "Confirm booking" : "Send booking request"}
          </button>
          {!props.autoConfirm && (
            <p className="hint -mt-2">The business confirms your time by text.</p>
          )}
        </form>
      )}
    </div>
  );
}

function Progress({ step, hasQuestions }: { step: Step; hasQuestions: boolean }) {
  const steps: { id: Step; label: string }[] = [
    ...(hasQuestions ? [{ id: "details" as Step, label: "Job details" }] : []),
    { id: "time", label: "Time" },
    { id: "contact", label: "Your details" },
  ];
  const index = steps.findIndex((s) => s.id === step);
  return (
    <ol className="mb-4 flex gap-4 text-sm" aria-label="Booking steps">
      {steps.map((s, i) => (
        <li
          key={s.id}
          aria-current={i === index ? "step" : undefined}
          className={i === index ? "font-bold text-ink" : i < index ? "text-ink" : "text-mist"}
        >
          {i + 1}. {s.label}
        </li>
      ))}
    </ol>
  );
}
