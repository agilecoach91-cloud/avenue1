import type { Metadata } from "next";
import { updateEnquiry } from "@/app/dashboard/actions";
import { Empty, EnquiryStatusPill, PageTitle } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { formatPhone, formatWhen } from "@/lib/format";
import { SOURCE_LABELS, parseSource } from "@/lib/source";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enquiry, EnquiryStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Quote requests" };

const STATUSES: { id: EnquiryStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default async function EnquiriesPage() {
  const { supabase, business } = await requireOwner();
  const { data } = await supabase
    .from("enquiries")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Enquiry[]>();
  const enquiries = data ?? [];

  // Private photos: short-lived signed links, created only after the owner check above.
  const paths = enquiries.flatMap((e) => e.photo_paths);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await createAdminClient().storage.from("enquiry-photos").createSignedUrls(paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return (
    <>
      <PageTitle title="Quote requests">Jobs that need a price. Call or text the customer, then update the status.</PageTitle>
      {enquiries.length === 0 ? (
        <Empty title="No quote requests yet.">They arrive here with the customer&apos;s photos.</Empty>
      ) : (
        <ul className="grid gap-3">
          {enquiries.map((e) => (
            <li key={e.id} className="panel p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="type-heading text-[1.05rem]">{e.service_name ?? "General enquiry"}</h2>
                <EnquiryStatusPill status={e.status} />
                <span className="text-sm text-mist">{formatWhen(e.created_at, business.timezone)}</span>
              </div>
              <p className="mt-1">
                {e.customer_name},{" "}
                <a className="font-semibold underline" href={`tel:${e.customer_phone}`}>
                  {formatPhone(e.customer_phone)}
                </a>
                {e.customer_email && (
                  <>
                    ,{" "}
                    <a className="underline" href={`mailto:${e.customer_email}`}>
                      {e.customer_email}
                    </a>
                  </>
                )}
              </p>
              {e.address && <p className="text-steel">{e.address}</p>}
              {e.message && <p className="mt-2 max-w-[65ch] whitespace-pre-line">{e.message}</p>}
              {e.photo_paths.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {e.photo_paths.map((p, i) =>
                    signed.get(p) ? (
                      <li key={p}>
                        <a href={signed.get(p)} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signed.get(p)}
                            alt={`Photo ${i + 1} from ${e.customer_name}`}
                            className="h-24 w-24 rounded-md border border-line object-cover"
                          />
                        </a>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
              <p className="mt-2 text-xs text-mist">Came from {SOURCE_LABELS[parseSource(e.source)]}.</p>
              <form action={updateEnquiry} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={e.id} />
                <a className="btn btn-primary btn-sm" href={`sms:${e.customer_phone}`}>
                  Text {e.customer_name.split(" ")[0]}
                </a>
                {STATUSES.filter((s) => s.id !== e.status && s.id !== "new").map((s) => (
                  <button key={s.id} name="status" value={s.id} className="btn btn-ghost btn-sm">
                    Mark {s.label.toLowerCase()}
                  </button>
                ))}
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
