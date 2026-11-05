import { redirect } from "next/navigation";
import { parseSource } from "@/lib/source";

type Props = {
  params: Promise<{ slug: string; serviceId: string }>;
  searchParams: Promise<{ src?: string }>;
};

/** Older single-service links now open the booking wizard with that service picked. */
export default async function BookServiceRedirect({ params, searchParams }: Props) {
  const { slug, serviceId } = await params;
  const { src } = await searchParams;
  const source = parseSource(src);
  redirect(`/${slug}/book?service=${encodeURIComponent(serviceId)}${source === "direct" ? "" : `&src=${source}`}`);
}
