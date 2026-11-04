import type { Metadata } from "next";
import Link from "next/link";
import { serviceCommand } from "@/app/dashboard/actions";
import { Empty, PageTitle, Saved } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";

export const metadata: Metadata = { title: "Services" };

type Props = { searchParams: Promise<{ saved?: string }> };

function Cmd({ id, command, label, danger }: { id: string; command: string; label: string; danger?: boolean }) {
  return (
    <form action={serviceCommand}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="command" value={command} />
      <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-ghost"}`} aria-label={label}>
        {label}
      </button>
    </form>
  );
}

export default async function ServicesPage({ searchParams }: Props) {
  const { saved } = await searchParams;
  const { supabase, business } = await requireOwner();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("sort")
    .returns<Service[]>();
  const services = data ?? [];

  return (
    <>
      <PageTitle title="Services and prices">
        This is the price list customers see. Fixed and &quot;from&quot; prices can be booked straight away; quote
        jobs collect photos instead.
      </PageTitle>
      <Saved show={Boolean(saved)}>Service saved</Saved>
      <Link href="/dashboard/services/new" className="btn btn-primary mb-5">
        Add a service
      </Link>
      {services.length === 0 ? (
        <Empty title="No services yet.">Add at least one so customers can book.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {services.map((s, i) => (
            <li key={s.id} className={`grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center ${s.active ? "" : "opacity-60"}`}>
              <div>
                <p className="type-heading">
                  {s.name}
                  {!s.active && <span className="ml-2 text-sm font-normal text-steel">Hidden</span>}
                </p>
                <p className="text-sm text-steel">
                  {formatPrice(s.price_type, s.price_cents)}.{" "}
                  {s.booking_mode === "quote" ? "Quote request" : `Books ${formatDuration(s.duration_min)}`}.
                  {s.questions.length > 0 && ` Asks ${s.questions.length} question${s.questions.length === 1 ? "" : "s"}.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/dashboard/services/${s.id}`} className="btn btn-dark btn-sm">
                  Edit
                </Link>
                {i > 0 && <Cmd id={s.id} command="up" label="Move up" />}
                {i < services.length - 1 && <Cmd id={s.id} command="down" label="Move down" />}
                <Cmd id={s.id} command="toggle" label={s.active ? "Hide" : "Show"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
