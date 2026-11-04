import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { BookingFlow } from "@/components/public/BookingFlow";
import { getPublicBusiness, loadSlotOptions } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/format";
import { datesWithSlots } from "@/lib/slots";
import { parseSource } from "@/lib/source";
import { isValidSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ slug: string; serviceId: string }>;
  searchParams: Promise<{ src?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = isValidSlug(slug) ? await getPublicBusiness(slug) : null;
  return data ? { title: `Book with ${data.business.name}` } : {};
}

export default async function BookServicePage({ params, searchParams }: Props) {
  const { slug, serviceId } = await params;
  const { src } = await searchParams;
  if (!isValidSlug(slug)) notFound();
  const data = await getPublicBusiness(slug);
  if (!data) notFound();
  const { business, services } = data;
  const service = services.find((s) => s.id === serviceId);
  if (!service) notFound();
  const source = parseSource(src);
  if (service.booking_mode === "quote") {
    redirect(`/${business.slug}/quote?service=${service.id}&src=${source}`);
  }

  const options = await loadSlotOptions(business, service);
  const dates = datesWithSlots(options);

  return (
    <PublicShell business={business} back={{ href: `/${business.slug}?src=${source}`, label: business.name }}>
      <header className="mb-6">
        <h1 className="type-display text-[1.75rem] sm:text-[2.1rem]">{service.name}</h1>
        <p className="mt-1 text-steel">
          {formatPrice(service.price_type, service.price_cents)}
          {service.price_type === "from" ? ", final price confirmed on site" : ""}. About{" "}
          {formatDuration(service.duration_min)}.
        </p>
        {service.description && <p className="mt-2 max-w-[60ch]">{service.description}</p>}
      </header>

      <BookingFlow
        slug={business.slug}
        serviceId={service.id}
        questions={service.questions}
        dates={dates}
        timezone={business.timezone}
        source={source}
        autoConfirm={business.auto_confirm}
        businessPhone={business.phone}
      />
    </PublicShell>
  );
}
