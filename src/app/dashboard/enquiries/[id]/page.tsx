import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { openConversation, updateEnquiry } from "@/app/dashboard/actions";
import { Icon } from "@/components/Icon";
import { MessageLog, type LogRow } from "@/components/dashboard/MessageLog";
import { EnquiryStatusPill } from "@/components/dashboard/ui";
import { ownerLocations, requireOwner } from "@/lib/data";
import { formatPhone, formatPrice, formatRelative } from "@/lib/format";
import { formatAddonPrice } from "@/lib/pricing";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enquiry, EnquiryStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Quote request" };

const STATUSES: { id: EnquiryStatus; label: string }[] = [
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireOwner();
  const { data: e } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle<Enquiry>();
  if (!e) notFound();
  const tz = business.timezone;
  const locations = await ownerLocations(supabase, business.id);
  const location = locations.length > 1 ? locations.find((l) => l.id === e.location_id) : null;
  const { data: log } = await supabase
    .from("message_log")
    .select("id,kind,channel,status,error,created_at")
    .eq("enquiry_id", e.id)
    .order("created_at")
    .returns<LogRow[]>();

  // Private photos: short-lived signed links, created only after the owner check above.
  const signed = new Map<string, string>();
  if (e.photo_paths.length) {
    const { data: urls } = await createAdminClient().storage.from("enquiry-photos").createSignedUrls(e.photo_paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  const answers = Object.entries(e.answers ?? {});

  return (
    <>
      <Link href="/dashboard/bookings?tab=quotes" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-steel hover:text-ink">
        <Icon name="left" size={16} /> Quote requests
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="type-display text-[1.6rem] sm:text-[2rem]">{e.service_name ?? "General enquiry"}</h1>
        <EnquiryStatusPill status={e.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <section className="panel p-5">
          {e.message && <p className="mb-5 max-w-[65ch] whitespace-pre-line text-[1.02rem]">{e.message}</p>}
          {e.photo_paths.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2">
              {e.photo_paths.map((p, i) =>
                signed.get(p) ? (
                  <li key={p}>
                    <a href={signed.get(p)} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signed.get(p)} alt={`Photo ${i + 1} from ${e.customer_name}`} className="h-28 w-28 rounded-md border border-line object-cover" />
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-[9rem_1fr]">
            <dt className="text-steel">Customer</dt>
            <dd>
              <span className="font-semibold">{e.customer_name}</span>
              <a className="block underline" href={`tel:${e.customer_phone}`}>
                {formatPhone(e.customer_phone)}
              </a>
              {e.customer_email && (
                <a className="block underline" href={`mailto:${e.customer_email}`}>
                  {e.customer_email}
                </a>
              )}
            </dd>
            {e.address && (
              <>
                <dt className="text-steel">Address</dt>
                <dd>{e.address}</dd>
              </>
            )}
            {location && (
              <>
                <dt className="text-steel">Location</dt>
                <dd>{location.name}</dd>
              </>
            )}
            {e.items.length > 0 && (
              <>
                <dt className="text-steel">Services</dt>
                <dd>
                  <ul className="grid gap-0.5">
                    {e.items.map((i) => (
                      <li key={i.service_id} className="flex justify-between gap-4">
                        <span>{i.name}</span>
                        <span className="tabular-nums">{formatPrice(i.price_type, i.price_cents)}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
            {e.addons.length > 0 && (
              <>
                <dt className="text-steel">Extras</dt>
                <dd>{e.addons.map((a) => `${a.name} (${formatAddonPrice(a)})`).join(", ")}</dd>
              </>
            )}
            {answers.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <dt className="text-steel">Came from</dt>
            <dd>
              {SOURCE_LABELS[parseSource(e.source)]}, {formatRelative(e.created_at, tz).toLowerCase()}
            </dd>
          </dl>
        </section>

        <aside className="grid content-start gap-4">
          <div className="panel grid gap-2 p-4">
            <p className="type-heading mb-1">Next step</p>
            <form action={openConversation}>
              <input type="hidden" name="phone" value={e.customer_phone} />
              <input type="hidden" name="name" value={e.customer_name} />
              <input type="hidden" name="location" value={e.location_id ?? ""} />
              <button className="btn btn-primary btn-sm w-full">
                <Icon name="message" size={18} /> Text {e.customer_name.split(" ")[0]} a price
              </button>
            </form>
            <form action={updateEnquiry} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={e.id} />
              {STATUSES.filter((s) => s.id !== e.status).map((s) => (
                <button key={s.id} name="status" value={s.id} className="btn btn-ghost btn-sm">
                  Mark {s.label.toLowerCase()}
                </button>
              ))}
            </form>
          </div>
          <MessageLog rows={log ?? []} timezone={tz} />
        </aside>
      </div>
    </>
  );
}
