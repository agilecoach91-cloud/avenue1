import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { QuoteForm } from "@/components/public/QuoteForm";
import { getPublicBusiness } from "@/lib/data";
import { parseSource } from "@/lib/source";
import { isValidSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; src?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = isValidSlug(slug) ? await getPublicBusiness(slug) : null;
  return data ? { title: `Get a quote from ${data.business.name}` } : {};
}

export default async function QuotePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { service: serviceId, src } = await searchParams;
  if (!isValidSlug(slug)) notFound();
  const data = await getPublicBusiness(slug);
  if (!data) notFound();
  const { business, services } = data;
  const source = parseSource(src);
  const selected = services.find((s) => s.id === serviceId) ?? null;

  return (
    <PublicShell business={business} back={{ href: `/${business.slug}?src=${source}`, label: business.name }}>
      <h1 className="type-display text-[1.75rem] sm:text-[2.1rem]">
        {selected ? `Quote: ${selected.name}` : "Get a quote"}
      </h1>
      <p className="mb-6 mt-1 max-w-[60ch] text-steel">
        Describe the job and add a few photos. {business.name} will get back to you with a price.
      </p>
      <QuoteForm
        slug={business.slug}
        source={source}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        selectedServiceId={selected?.id ?? null}
      />
    </PublicShell>
  );
}
