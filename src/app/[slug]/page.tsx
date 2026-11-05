import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, hasIcon } from "@/components/Icon";
import { BusinessMark, PublicShell } from "@/components/public/PublicShell";
import { TrackView } from "@/components/public/TrackView";
import { getPublicBusiness } from "@/lib/data";
import { formatDuration, formatPhone, formatPrice } from "@/lib/format";
import { parseSource } from "@/lib/source";
import { isValidSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return {};
  const data = await getPublicBusiness(slug);
  if (!data) return {};
  const { business } = data;
  return {
    title: `${business.name}: book online`,
    description: business.tagline || `Book ${business.name} online.`,
  };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { src } = await searchParams;
  if (!isValidSlug(slug)) notFound();
  const data = await getPublicBusiness(slug);
  if (!data) notFound();
  const { business, services, locations } = data;
  const source = parseSource(src);
  const srcParam = source === "direct" ? "" : `src=${source}`;
  const bookHref = (extra = "") => {
    const qs = [extra, srcParam].filter(Boolean).join("&");
    return `/${business.slug}/book${qs ? `?${qs}` : ""}`;
  };
  const phone = formatPhone(business.phone);

  return (
    <PublicShell business={business}>
      <TrackView slug={business.slug} source={source} />

      <header className="flex items-start gap-4">
        <BusinessMark business={business} size={64} />
        <div className="min-w-0">
          <h1 className="type-display text-[2rem] leading-none sm:text-[2.5rem]">{business.name}</h1>
          {business.tagline && <p className="mt-2 text-steel">{business.tagline}</p>}
        </div>
      </header>

      <dl className="mt-5 grid gap-1.5 text-[0.95rem]">
        {business.google_rating != null && (
          <div className="flex gap-2">
            <dt className="sr-only">Google rating</dt>
            <dd>
              <span className="font-bold">★ {Number(business.google_rating).toFixed(1)}</span>{" "}
              <span className="text-steel">
                on Google{business.google_review_count ? ` from ${business.google_review_count} reviews` : ""}
              </span>
            </dd>
          </div>
        )}
        {phone && (
          <div className="flex gap-2">
            <dt className="text-steel">Phone</dt>
            <dd>
              <a href={`tel:${business.phone}`} className="underline underline-offset-2">
                {phone}
              </a>
            </dd>
          </div>
        )}
        {business.service_area && (
          <div className="flex gap-2">
            <dt className="text-steel">Servicing</dt>
            <dd>{business.service_area}</dd>
          </div>
        )}
        {business.licence_number && (
          <div className="flex gap-2">
            <dt className="text-steel">Licence</dt>
            <dd>{business.licence_number}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 grid gap-2">
        {services.length > 0 && (
          <Link href={bookHref()} className="btn btn-brand w-full text-[1.05rem]">
            <Icon name="calendar" size={20} /> Book online
          </Link>
        )}
        {phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${business.phone}`} className="btn btn-ghost" aria-label={`Call ${phone}`}>
              <Icon name="phone" size={18} /> Call us
            </a>
            <a href={`sms:${business.phone}`} className="btn btn-ghost">
              <Icon name="message" size={18} /> Send a text
            </a>
          </div>
        )}
      </div>

      <section aria-labelledby="services" className="mt-8">
        <h2 id="services" className="type-heading mb-3 text-lg">
          Book a service
        </h2>
        {services.length === 0 ? (
          <p className="panel p-5 text-steel">Online booking opens soon. Call to book in the meantime.</p>
        ) : (
          <ul className="panel divide-y divide-line overflow-hidden">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={bookHref(`service=${s.id}`)}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-4 hover:bg-surface sm:px-5"
                >
                  <span className="tile-icon row-span-2 h-11 w-11">
                    <Icon name={hasIcon(s.icon) ? s.icon : s.booking_mode === "quote" ? "clipboard" : "wrench"} size={22} />
                  </span>
                  <span className="type-heading text-[1.05rem]">{s.name}</span>
                  <span className="type-display text-right text-[1.15rem]">{formatPrice(s.price_type, s.price_cents)}</span>
                  <span className="text-sm text-steel">
                    {s.booking_mode === "quote" ? "Send photos for a quote" : `About ${formatDuration(s.duration_min)}`}
                  </span>
                  <span className="text-right text-sm font-bold underline decoration-2 underline-offset-4 group-hover:decoration-[var(--brand)]">
                    {s.booking_mode === "quote" ? "Get a quote" : "Pick a time"}
                  </span>
                  {s.description && (
                    <span className="col-span-2 col-start-2 max-w-[60ch] text-sm text-steel">{s.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {locations.length > 1 && (
        <section aria-labelledby="locations" className="mt-8">
          <h2 id="locations" className="type-heading mb-3 text-lg">
            Our locations
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {locations.map((l) => (
              <li key={l.id} className="panel flex flex-col gap-2 p-4">
                <p className="flex items-start gap-2">
                  <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-steel" />
                  <span>
                    <span className="type-heading block">{l.name}</span>
                    {l.address && <span className="block text-sm text-steel">{l.address}</span>}
                  </span>
                </p>
                <Link href={bookHref(`location=${l.id}`)} className="btn btn-ghost btn-sm self-start">
                  Book at {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {business.about && (
        <section aria-labelledby="about" className="mt-8">
          <h2 id="about" className="type-heading mb-2 text-lg">
            About us
          </h2>
          <p className="whitespace-pre-line text-[0.98rem]">{business.about}</p>
        </section>
      )}

      <nav aria-label="Other links" className="mt-8 flex flex-wrap gap-2">
        {business.google_review_url && (
          <a className="btn btn-ghost btn-sm" href={business.google_review_url} target="_blank" rel="noreferrer">
            Leave a Google review
          </a>
        )}
        {business.instagram_url && (
          <a className="btn btn-ghost btn-sm" href={business.instagram_url} target="_blank" rel="noreferrer">
            Instagram
          </a>
        )}
        {business.facebook_url && (
          <a className="btn btn-ghost btn-sm" href={business.facebook_url} target="_blank" rel="noreferrer">
            Facebook
          </a>
        )}
        {business.website_url && (
          <a className="btn btn-ghost btn-sm" href={business.website_url} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
      </nav>

      {services.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-xl gap-2">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="btn btn-ghost flex-1">
                Call
              </a>
            )}
            <Link href={bookHref()} className="btn btn-brand flex-[2]">
              Book online
            </Link>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
