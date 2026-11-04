import { getPublicBusiness } from "@/lib/data";
import { parseSource } from "@/lib/source";
import { createAdminClient } from "@/lib/supabase/admin";

const KINDS = new Set(["view", "start_booking", "start_quote"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: string; source?: string; kind?: string } | null;
  if (!body?.slug) return new Response(null, { status: 204 });
  const kind = KINDS.has(body.kind ?? "") ? body.kind! : "view";
  const data = await getPublicBusiness(body.slug);
  if (data) {
    await createAdminClient()
      .from("page_events")
      .insert({ business_id: data.business.id, kind, source: parseSource(body.source) });
  }
  return new Response(null, { status: 204 });
}
