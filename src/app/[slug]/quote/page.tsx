import { notFound, redirect } from "next/navigation";
import { getPublicBusiness } from "@/lib/data";
import { parseSource } from "@/lib/source";
import { isValidSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; src?: string }>;
};

/** Quote links open the booking wizard on a quote-only service. */
export default async function QuoteRedirect({ params, searchParams }: Props) {
  const { slug } = await params;
  const { service, src } = await searchParams;
  if (!isValidSlug(slug)) notFound();
  const data = await getPublicBusiness(slug);
  if (!data) notFound();
  const source = parseSource(src);
  const pick =
    data.services.find((s) => s.id === service) ?? data.services.find((s) => s.booking_mode === "quote") ?? null;
  const q = new URLSearchParams();
  if (pick) q.set("service", pick.id);
  if (source !== "direct") q.set("src", source);
  const qs = q.toString();
  redirect(`/${data.business.slug}/book${qs ? `?${qs}` : ""}`);
}
