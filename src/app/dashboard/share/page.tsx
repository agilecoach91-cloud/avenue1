import type { Metadata } from "next";
import QRCode from "qrcode";
import { CopyField } from "@/components/dashboard/CopyField";
import { PageTitle } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Share your page" };

export default async function SharePage() {
  const { supabase, business } = await requireOwner();
  const locations = await ownerLocations(supabase, business.id);
  const base = `${appUrl()}/${business.slug}`;
  const links = {
    google: `${base}/book?src=google`,
    instagram: `${base}?src=instagram`,
    facebook: `${base}?src=facebook`,
    website: `${base}/book?src=website`,
    qr: `${base}?src=qr`,
  };
  const qrSvg = await QRCode.toString(links.qr, { type: "svg", margin: 1, color: { dark: "#14212b", light: "#ffffff" } });
  const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
  const embed = `<script src="${appUrl()}/embed.js" data-business="${business.slug}" data-label="Book online" data-color="${business.brand_color}" async></script>`;
  const icsUrl = `${appUrl()}/api/ics/${business.ics_token}`;

  return (
    <>
      <PageTitle title="Share your page">
        Each place gets its own link, so you can see which one brings in bookings.
      </PageTitle>

      <section aria-labelledby="google" className="mb-10">
        <h2 id="google" className="type-heading mb-1 text-lg">Google Business Profile</h2>
        <p className="mb-4 max-w-[65ch] text-steel">
          This adds a &quot;Book online&quot; button to your Google listing in Search and Maps. Customers go straight to
          your booking steps. It&apos;s free and takes two minutes.
        </p>
        {locations.length > 1 ? (
          <div className="grid gap-4">
            <p className="max-w-[65ch] text-steel">Each location has its own Google listing, so each gets its own link.</p>
            {locations.map((l) => (
              <CopyField key={l.id} label={`Google booking link: ${l.name}`} value={`${base}/book?location=${l.id}&src=google`} />
            ))}
          </div>
        ) : (
          <CopyField label="Your Google booking link" value={links.google} />
        )}
        <ol className="mt-4 grid max-w-[65ch] list-decimal gap-1.5 pl-5">
          <li>Search Google for your business name while signed in, or open the Google Maps app.</li>
          <li>Choose <strong>Edit profile</strong>, then <strong>Bookings</strong> (it may sit under Business information).</li>
          <li>Choose <strong>Add a link</strong> and paste the link above.</li>
          <li>Save, and set it as your preferred link if Google asks.</li>
        </ol>
        <p className="hint mt-2">
          Google can take up to three days to show it. If you don&apos;t see Bookings, paste the link as your website
          instead.
        </p>
      </section>

      <section aria-labelledby="social" className="mb-10 grid gap-4">
        <h2 id="social" className="type-heading text-lg">Instagram, Facebook and TikTok</h2>
        <p className="max-w-[65ch] text-steel">Your bio link opens your page: prices, reviews, call and text buttons, and Book online.</p>
        <CopyField label="Instagram and TikTok bio link" value={links.instagram} />
        <CopyField label="Facebook page link" value={links.facebook} />
        <p className="hint">On Instagram: Edit profile, then Links, then Add external link.</p>
      </section>

      <section aria-labelledby="website" className="mb-10 grid gap-4">
        <h2 id="website" className="type-heading text-lg">Your website</h2>
        <p className="max-w-[65ch] text-steel">
          Adds a floating &quot;Book online&quot; button. It opens your booking steps in a pop-up, so customers never
          leave your site.
        </p>
        <CopyField label="Website code (paste before &lt;/body&gt;)" value={embed} multiline />
        <p className="hint max-w-[65ch]">
          To open the pop-up from your own button too, add <code className="rounded bg-surface px-1">data-bookd-open</code> to it.
        </p>
        <CopyField label="Or a plain link for a Book button" value={links.website} />
      </section>

      <section aria-labelledby="qr" className="mb-10">
        <h2 id="qr" className="type-heading mb-1 text-lg">QR code</h2>
        <p className="mb-4 max-w-[65ch] text-steel">For your van, invoices, flyers and fridge magnets.</p>
        <div className="flex flex-wrap items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code linking to ${base}`} width={180} height={180} className="rounded-md border border-line bg-paper" />
          <a href={qrDataUrl} download={`${business.slug}-qr.svg`} className="btn btn-ghost btn-sm">
            Download QR code
          </a>
        </div>
      </section>

      <section aria-labelledby="calendar" className="mb-6">
        <h2 id="calendar" className="type-heading mb-1 text-lg">See bookings in your phone calendar</h2>
        <p className="mb-4 max-w-[65ch] text-steel">
          Subscribe to this link in Google Calendar (Other calendars, From URL) or on iPhone (Settings, Calendar,
          Accounts, Add subscribed calendar). Keep it private: anyone with it can see your bookings.
        </p>
        <CopyField label="Calendar feed" value={icsUrl} />
      </section>
    </>
  );
}
