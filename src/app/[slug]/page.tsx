import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const { business, services } = data;
  const source = parseSource(src);
  const q = source === "direct" ? "" : `?src=${source}`;
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

      {phone && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href={`tel:${business.phone}`} className="btn btn-ghost" aria-label={`Call ${phone}`}>
            Call us
          </a>
          <a href={`sms:${business.phone}`} className="btn btn-ghost">
            Send a text
          </a>
        </div>
      )}

      <section aria-labelledby="services" className="mt-8">
        <h2 id="services" className="type-heading mb-3 text-lg">
          Book a service
        </h2>
        {services.length === 0 ? (
          <p className="panel p-5 text-steel">Online booking opens soon. Call to book in the meantime.</p>
        ) : (
          <ul className="panel divide-y divide-line overflow-hidden">
            {services.map((s) => {
              const href =
                s.booking_mode === "quote"
                  ? `/${business.slug}/quote?service=${s.id}${source === "direct" ? "" : `&src=${source}`}`
                  : `/${business.slug}/book/${s.id}${q}`;
              return (
                <li key={s.id}>
                  <Link
                    href={href}
                    className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-4 hover:bg-surface sm:px-5"
                  >
                    <span className="type-heading text-[1.05rem]">{s.name}</span>
                    <span className="type-display text-right text-[1.15rem]">
                      {formatPrice(s.price_type, s.price_cents)}
                    </span>
                    <span className="text-sm text-steel">
                      {s.booking_mode === "quote" ? "Send photos for a quote" : `About ${formatDuration(s.duration_min)}`}
                    </span>
                    <span className="text-right text-sm font-bold underline decoration-2 underline-offset-4 group-hover:decoration-[var(--brand)]">
                      {s.booking_mode === "quote" ? "Get a quote" : "Pick a time"}
                    </span>
                    {s.description && (
                      <span className="col-span-2 max-w-[60ch] text-sm text-steel">{s.description}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          <Link
            href={`/${business.slug}/quote${q}`}
            className="btn btn-ghost flex-1"
          >
            Get a quote
          </Link>
          <a href="#services" className="btn btn-brand flex-1">
            Book online
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
