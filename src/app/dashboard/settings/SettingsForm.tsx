"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "@/app/dashboard/actions";
import { Saved } from "@/components/dashboard/ui";
import { formatPhone, TIMEZONES } from "@/lib/format";
import type { Business } from "@/lib/types";

function Text({ name, label, value, hint, type = "text", placeholder, required }: {
  name: string; label: string; value?: string | null; hint?: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {!required && <span className="font-normal text-steel"> (optional)</span>}
      </label>
      <input id={name} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} required={required} className="field" />
      {hint && <p className="hint mt-1">{hint}</p>}
    </div>
  );
}

export function SettingsForm({ business: b }: { business: Business }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  return (
    <form action={action} className="grid gap-8">
      <Saved show={Boolean(state.ok)}>Settings saved</Saved>
      {state.error && <p role="alert" className="rounded-md bg-stop-soft p-3 text-sm text-stop">{state.error}</p>}

      <fieldset className="panel grid gap-4 p-5">
        <legend className="type-heading px-1">Your page</legend>
        <Text name="name" label="Business name" value={b.name} required />
        <Text name="tagline" label="One-line description" value={b.tagline} placeholder="Licensed pest control on the Northern Beaches" />
        <div>
          <label className="label" htmlFor="about">About <span className="font-normal text-steel">(optional)</span></label>
          <textarea id="about" name="about" defaultValue={b.about ?? ""} className="field" placeholder="Family-owned since 2009. Pet-safe treatments." />
        </div>
        <Text name="service_area" label="Areas you service" value={b.service_area} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="licence_number" label="Licence number" value={b.licence_number} hint="Shown on your page." />
          <Text name="abn" label="ABN or NZBN" value={b.abn} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="logo">Logo <span className="font-normal text-steel">(optional)</span></label>
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="brand_color">Brand colour</label>
            <input id="brand_color" name="brand_color" type="color" defaultValue={b.brand_color} className="h-12 w-24 cursor-pointer rounded-md border-[1.5px] border-line bg-paper p-1" />
          </div>
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="published" defaultChecked={b.published} className="mt-1 h-5 w-5" />
          <span>
            <span className="font-semibold">Page is live</span>
            <span className="hint block">Turn off to hide your page while you get set up.</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="panel grid gap-4 p-5">
        <legend className="type-heading px-1">Contact and notifications</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="phone" label="Mobile" type="tel" value={formatPhone(b.phone)} required />
          <Text name="email" label="Email" type="email" value={b.email} required />
        </div>
        <div>
          <label className="label" htmlFor="timezone">State</label>
          <select id="timezone" name="timezone" defaultValue={b.timezone} className="field">
            {TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="notify_owner_sms" defaultChecked={b.notify_owner_sms} className="h-5 w-5" />
          Text me new bookings and quote requests
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="notify_owner_email" defaultChecked={b.notify_owner_email} className="h-5 w-5" />
          Email me new bookings and quote requests
        </label>
      </fieldset>

      <fieldset className="panel grid gap-4 p-5">
        <legend className="type-heading px-1">Reviews and links</legend>
        <Text
          name="google_review_url"
          label="Google review link"
          value={b.google_review_url}
          hint="In your Google Business Profile, choose Ask for reviews and copy the link. We text it to customers after each job."
        />
        <div>
          <label className="label" htmlFor="review_delay_hours">Send the review request</label>
          <select id="review_delay_hours" name="review_delay_hours" defaultValue={b.review_delay_hours} className="field">
            <option value={0}>As soon as I mark the job done</option>
            <option value={2}>2 hours after</option>
            <option value={24}>The next day</option>
          </select>
        </div>
        <Text name="instagram_url" label="Instagram" value={b.instagram_url} placeholder="instagram.com/yourbusiness" />
        <Text name="facebook_url" label="Facebook" value={b.facebook_url} />
        <Text name="website_url" label="Website" value={b.website_url} />
      </fieldset>

      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
