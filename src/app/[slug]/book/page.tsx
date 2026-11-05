import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessMark } from "@/components/public/PublicShell";
import { BookingWizard } from "@/components/public/BookingWizard";
import { TrackView } from "@/components/public/TrackView";
import { brandStyle } from "@/lib/color";
import { getPublicBusiness, pickLocation } from "@/lib/data";
import { parseSource } from "@/lib/source";
import { isValidSlug } from "@/lib/slug";
import { PLAN_FEATURES } from "@/lib/types";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; location?: string; src?: string; embed?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = isValidSlug(slug) ? await getPublicBusiness(slug) : null;
  return data ? { title: `Book online: ${data.business.name}` } : {};
}

/**
 * The booking wizard. This is the link for the Google "Book online" button and
 * the page the website widget opens (with ?embed=1).
 */
export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { service, location: locationParam, src, embed } = await searchParams;
  if (!isValidSlug(slug)) notFound();
  const data = await getPublicBusiness(slug);
  if (!data) notFound();
  const { business, services, addons, locations } = data;
  const source = parseSource(src);
  const embedded = embed === "1";
  const wanted = (service ?? "").split(",").filter(Boolean);
  const initialServiceIds = services.filter((s) => wanted.includes(s.id)).map((s) => s.id);
  const location = pickLocation(locations, locationParam);

  const wizard = (
    <BookingWizard
      business={{
        slug: business.slug,
        name: business.name,
        tagline: business.tagline,
        about: business.about,
        phone: business.phone,
        logo_url: business.logo_url,
        cover_url: business.cover_url,
        google_rating: business.google_rating,
        google_review_count: business.google_review_count,
        licence_number: business.licence_number,
        service_area: business.service_area,
        auto_confirm: business.auto_confirm,
        badge: PLAN_FEATURES[business.plan].badge,
        texts: PLAN_FEATURES[business.plan].customerSms,
      }}
      services={services}
      addons={addons}
      locations={locations}
      initialServiceIds={initialServiceIds}
      initialLocationId={location?.id ?? null}
      source={source}
      embedded={embedded}
      closeHref={`/${business.slug}${source === "direct" ? "" : `?src=${source}`}`}
    />
  );

  return (
    <div style={brandStyle(business.brand_color)} className={embedded ? "min-h-dvh bg-paper" : "min-h-dvh bg-surface"}>
      <TrackView slug={business.slug} source={source} kind="start_booking" />
      {embedded ? (
        wizard
      ) : (
        <div className="mx-auto max-w-[56rem] pb-12 sm:px-4 sm:pt-8">
          <header className="flex items-center gap-3 px-4 py-4 sm:px-1">
            <BusinessMark business={business} size={44} />
            <div className="min-w-0">
              <p className="type-heading truncate">{business.name}</p>
              <p className="truncate text-sm text-steel">
                {location?.address ?? location?.name ?? business.service_area ?? ""}
              </p>
            </div>
          </header>
          {wizard}
        </div>
      )}
    </div>
  );
}
