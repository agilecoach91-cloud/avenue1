import type { Metadata } from "next";
import Link from "next/link";
import { addonCommand, serviceCommand } from "@/app/dashboard/actions";
import { Icon, hasIcon } from "@/components/Icon";
import { Empty, PageTitle, Saved } from "@/components/dashboard/ui";
import { requireOwner } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/format";
import { formatAddonPrice } from "@/lib/pricing";
import type { Addon, Service } from "@/lib/types";

export const metadata: Metadata = { title: "Services" };

type Props = { searchParams: Promise<{ saved?: string }> };

function Cmd({
  action,
  id,
  command,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  command: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="command" value={command} />
      <button className="btn btn-ghost btn-sm" aria-label={label}>
        {label}
      </button>
    </form>
  );
}

function Row({
  icon,
  title,
  detail,
  hidden,
  editHref,
  action,
  id,
  first,
  last,
}: {
  icon: string;
  title: string;
  detail: string;
  hidden: boolean;
  editHref: string;
  action: (formData: FormData) => Promise<void>;
  id: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <li className={`grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${hidden ? "opacity-60" : ""}`}>
      <span className="tile-icon hidden h-11 w-11 sm:grid" style={{ background: "var(--color-surface)" }}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="type-heading">
          {title}
          {hidden && <span className="ml-2 text-sm font-normal text-steel">Hidden</span>}
        </p>
        <p className="text-sm text-steel">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link href={editHref} className="btn btn-dark btn-sm">
          Edit
        </Link>
        {!first && <Cmd action={action} id={id} command="up" label="Move up" />}
        {!last && <Cmd action={action} id={id} command="down" label="Move down" />}
        <Cmd action={action} id={id} command="toggle" label={hidden ? "Show" : "Hide"} />
      </div>
    </li>
  );
}

export default async function ServicesPage({ searchParams }: Props) {
  const { saved } = await searchParams;
  const { supabase, business } = await requireOwner();
  const [{ data: services }, { data: addons }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id).order("sort").returns<Service[]>(),
    supabase.from("addons").select("*").eq("business_id", business.id).order("sort").returns<Addon[]>(),
  ]);

  return (
    <>
      <PageTitle title="Services and prices">
        Customers pick from these tiles when they book. Fixed and &quot;from&quot; prices can be booked straight away;
        quote jobs collect photos instead.
      </PageTitle>
      <Saved show={saved === "1"}>Service saved</Saved>
      <Saved show={saved === "addon"}>Add-on saved</Saved>
      <Link href="/dashboard/services/new" className="btn btn-primary mb-5">
        Add a service
      </Link>
      {(services ?? []).length === 0 ? (
        <Empty title="No services yet.">Add at least one so customers can book.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {(services ?? []).map((s, i, all) => (
            <Row
              key={s.id}
              id={s.id}
              icon={hasIcon(s.icon) ? s.icon : s.booking_mode === "quote" ? "clipboard" : "wrench"}
              title={s.name}
              detail={`${formatPrice(s.price_type, s.price_cents)}. ${
                s.booking_mode === "quote" ? "Quote request" : `Books ${formatDuration(s.duration_min)}`
              }.${s.questions.length > 0 ? ` Asks ${s.questions.length} question${s.questions.length === 1 ? "" : "s"}.` : ""}`}
              hidden={!s.active}
              editHref={`/dashboard/services/${s.id}`}
              action={serviceCommand}
              first={i === 0}
              last={i === all.length - 1}
            />
          ))}
        </ul>
      )}

      <h2 className="type-heading mb-1 mt-10 text-lg">Add-ons</h2>
      <p className="mb-4 max-w-[65ch] text-steel">
        Extras offered after the customer picks a time (&quot;Do you need anything else?&quot;). They&apos;re added to
        the same visit and the total price.
      </p>
      <Link href="/dashboard/services/addons/new" className="btn btn-ghost mb-5">
        <Icon name="plus" size={18} /> Add an add-on
      </Link>
      {(addons ?? []).length === 0 ? (
        <Empty title="No add-ons yet.">Popular ones: an extra unit, a downpipe flush, a loan car.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {(addons ?? []).map((a, i, all) => (
            <Row
              key={a.id}
              id={a.id}
              icon={hasIcon(a.icon) ? a.icon : "plus"}
              title={a.name}
              detail={[formatAddonPrice(a), a.description].filter(Boolean).join(". ")}
              hidden={!a.active}
              editHref={`/dashboard/services/addons/${a.id}`}
              action={addonCommand}
              first={i === 0}
              last={i === all.length - 1}
            />
          ))}
        </ul>
      )}
    </>
  );
}
